import json
import logging
import shutil
import subprocess
import time
from typing import Optional, List, Dict, Any

from app.core.config import Settings, get_settings
from app.schemas.analysis import TestCase
from app.schemas.test_runner import (
    TestExecutionRequest,
    TestExecutionResponse,
    TestCaseResult,
)

logger = logging.getLogger("devshield.runner")


class TestRunnerService:
    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()

    def is_docker_available(self) -> bool:
        """
        Verifies that Docker CLI is installed AND the Docker daemon is responding.
        Returns False immediately if unavailable, without blocking.
        """
        docker_path = shutil.which("docker")
        if not docker_path:
            return False

        try:
            # Check if docker daemon is actually reachable
            result = subprocess.run(
                ["docker", "info"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=2.5,
                text=True,
            )
            return result.returncode == 0
        except Exception:
            return False

    def execute_tests(self, request: TestExecutionRequest) -> TestExecutionResponse:
        """
        Executes code and tests only within a secured Docker sandbox.
        NEVER falls back to host execution if Docker is unavailable.
        """
        start_time = time.perf_counter()

        # Step 1: Verify secure Docker runner availability
        if not self.is_docker_available():
            duration_ms = (time.perf_counter() - start_time) * 1000
            total_tests = len(request.tests) if request.tests else (1 if request.custom_test_code else 0)
            return TestExecutionResponse(
                status="unavailable",
                secure_mode=False,
                passed_count=0,
                total_count=total_tests,
                results=[],
                captured_output="[SECURITY POLICY] Host execution blocked: Container sandbox unreachable.",
                error_message=(
                    "Secure execution environment is unavailable. Docker daemon is not running or Docker is not installed. "
                    "DevShield AI strictly prohibits arbitrary code execution directly on the host for safety. "
                    "To enable test execution, start Docker Desktop and ensure Docker engine is active."
                ),
                execution_time_ms=round(duration_ms, 2),
            )

        # Step 2: Build self-contained Python test runner harness
        harness_script = self._generate_test_harness(request.code, request.tests, request.custom_test_code)

        # Step 3: Run inside isolated ephemeral Docker container
        try:
            return self._run_in_docker(harness_script, start_time)
        except subprocess.TimeoutExpired:
            duration_ms = (time.perf_counter() - start_time) * 1000
            return TestExecutionResponse(
                status="error",
                secure_mode=True,
                passed_count=0,
                total_count=len(request.tests),
                results=[],
                captured_output="",
                error_message=f"Execution timed out after {self.settings.TEST_TIMEOUT_SECONDS} seconds.",
                execution_time_ms=round(duration_ms, 2),
            )
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.exception("Failed executing test runner in Docker")
            return TestExecutionResponse(
                status="error",
                secure_mode=True,
                passed_count=0,
                total_count=len(request.tests),
                results=[],
                captured_output="",
                error_message=f"Sandbox execution error: {str(e)}",
                execution_time_ms=round(duration_ms, 2),
            )

    def _generate_test_harness(
        self,
        candidate_code: str,
        tests: List[TestCase],
        custom_test_code: Optional[str],
    ) -> str:
        """
        Generates a Python script that runs the candidate code and evaluates each test case,
        emitting JSON structured results to stdout.
        """
        # Serialize test cases into JSON string to inject safely
        tests_data = [{"name": t.name, "code": t.code} for t in tests]
        tests_json = json.dumps(tests_data)
        custom_code_json = json.dumps(custom_test_code or "")
        candidate_code_json = json.dumps(candidate_code)

        harness = f"""# DevShield AI Secure Test Harness
import sys
import io
import json
import time
import traceback

candidate_code = {candidate_code_json}
tests_data = json.loads({json.dumps(tests_json)})
custom_code = {custom_code_json}

results = []
all_output = io.StringIO()

# Global execution scope
exec_globals = {{
    "__name__": "__test_runner__",
}}

# Execute the candidate code first
candidate_success = True
candidate_stdout = io.StringIO()
old_stdout = sys.stdout
old_stderr = sys.stderr

try:
    sys.stdout = candidate_stdout
    sys.stderr = candidate_stdout
    exec(candidate_code, exec_globals)
except Exception as e:
    candidate_success = False
    candidate_err = traceback.format_exc()
finally:
    sys.stdout = old_stdout
    sys.stderr = old_stderr

candidate_logs = candidate_stdout.getvalue()
all_output.write(candidate_logs)

if not candidate_success:
    # If candidate code fails to define or parse, fail all tests
    for t in tests_data:
        results.append({{
            "name": t["name"],
            "status": "error",
            "output": candidate_logs,
            "error": "Failed to compile/execute candidate code: " + candidate_err.strip().splitlines()[-1],
            "duration_ms": 0.0,
        }})
else:
    # Run structured test cases
    for t in tests_data:
        t_name = t["name"]
        t_code = t["code"]
        t_out = io.StringIO()
        t_status = "passed"
        t_err = None
        t_start = time.perf_counter()

        test_scope = dict(exec_globals)
        try:
            sys.stdout = t_out
            sys.stderr = t_out
            exec(t_code, test_scope)
        except AssertionError as e:
            t_status = "failed"
            t_err = str(e) or "AssertionError"
        except Exception as e:
            t_status = "error"
            t_err = f"{{type(e).__name__}}: {{str(e)}}"
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr

        t_duration = (time.perf_counter() - t_start) * 1000
        t_output_val = t_out.getvalue()
        if t_output_val:
            all_output.write(f"\\n--- [{{t_name}}] ---\\n{{t_output_val}}")

        results.append({{
            "name": t_name,
            "status": t_status,
            "output": t_output_val,
            "error": t_err,
            "duration_ms": round(t_duration, 2),
        }})

    if custom_code and custom_code.strip():
        t_out = io.StringIO()
        t_status = "passed"
        t_err = None
        t_start = time.perf_counter()
        try:
            sys.stdout = t_out
            sys.stderr = t_out
            exec(custom_code, exec_globals)
        except AssertionError as e:
            t_status = "failed"
            t_err = str(e) or "AssertionError"
        except Exception as e:
            t_status = "error"
            t_err = f"{{type(e).__name__}}: {{str(e)}}"
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr
        t_duration = (time.perf_counter() - t_start) * 1000
        results.append({{
            "name": "custom_test_suite",
            "status": t_status,
            "output": t_out.getvalue(),
            "error": t_err,
            "duration_ms": round(t_duration, 2),
        }})

passed_count = sum(1 for r in results if r["status"] == "passed")
total_count = len(results)

output_payload = {{
    "results": results,
    "passed_count": passed_count,
    "total_count": total_count,
    "captured_output": all_output.getvalue(),
}}

print("DEVSHIELD_RESULT_START")
print(json.dumps(output_payload))
print("DEVSHIELD_RESULT_END")
"""
        return harness

    def _run_in_docker(self, script_content: str, start_time: float) -> TestExecutionResponse:
        """
        Spawns an ephemeral, unprivileged Docker container passing script via stdin.
        Enforces memory, CPU, network, process, read-only, and timeout constraints.
        """
        docker_cmd = [
            "docker",
            "run",
            "--rm",
            "-i",
            "--network", "none",
            "--memory", "128m",
            "--cpus", "0.5",
            "--pids-limit", "30",
            "--read-only",
            "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",
            "--cap-drop", "ALL",
            "--user", "1000:1000",
            self.settings.DOCKER_IMAGE,
            "python", "-u", "-"
        ]

        logger.info("Executing test in secure Docker sandbox")
        proc = subprocess.run(
            docker_cmd,
            input=script_content,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=self.settings.TEST_TIMEOUT_SECONDS,
        )

        duration_ms = (time.perf_counter() - start_time) * 1000
        stdout_raw = proc.stdout
        stderr_raw = proc.stderr

        if proc.returncode != 0 and "DEVSHIELD_RESULT_START" not in stdout_raw:
            return TestExecutionResponse(
                status="error",
                secure_mode=True,
                passed_count=0,
                total_count=0,
                results=[],
                captured_output=stderr_raw[:self.settings.MAX_OUTPUT_SIZE_BYTES],
                error_message=f"Sandbox process exited with code {proc.returncode}: {stderr_raw.strip()}",
                execution_time_ms=round(duration_ms, 2),
            )

        # Extract structured payload from sentinel markers
        try:
            start_marker = "DEVSHIELD_RESULT_START"
            end_marker = "DEVSHIELD_RESULT_END"
            if start_marker in stdout_raw and end_marker in stdout_raw:
                json_part = stdout_raw.split(start_marker)[1].split(end_marker)[0].strip()
                payload = json.loads(json_part)

                results = [TestCaseResult(**r) for r in payload.get("results", [])]
                passed = payload.get("passed_count", 0)
                total = payload.get("total_count", len(results))
                captured = payload.get("captured_output", "")[:self.settings.MAX_OUTPUT_SIZE_BYTES]

                overall_status = "passed" if (total > 0 and passed == total) else "failed"

                return TestExecutionResponse(
                    status=overall_status,
                    secure_mode=True,
                    passed_count=passed,
                    total_count=total,
                    results=results,
                    captured_output=captured,
                    error_message=None if overall_status == "passed" else f"{total - passed} of {total} test(s) failed or encountered errors.",
                    execution_time_ms=round(duration_ms, 2),
                )
        except Exception as e:
            logger.error(f"Failed parsing container harness output: {e}")

        # Fallback if sentinel parsing failed
        return TestExecutionResponse(
            status="error",
            secure_mode=True,
            passed_count=0,
            total_count=0,
            results=[],
            captured_output=stdout_raw[:self.settings.MAX_OUTPUT_SIZE_BYTES],
            error_message="Could not parse structured test results from secure container.",
            execution_time_ms=round(duration_ms, 2),
        )
