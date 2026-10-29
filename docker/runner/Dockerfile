# DevShield AI Secure Test Runner Container
# Designed for isolated, unprivileged, network-less execution of untrusted candidate code.
FROM python:3.11-slim

# Create unprivileged runner user
RUN groupadd -g 1000 sandbox && \
    useradd -u 1000 -g sandbox -m -s /bin/sh sandbox

# Set working directory
WORKDIR /home/sandbox

# Switch to unprivileged non-root user
USER 1000:1000

# Default command: accept python code from stdin
ENTRYPOINT ["python", "-u", "-"]
