.PHONY: dev generate-path-script

BUILD_DIR := $(shell pwd)/dist

# Build the CLI using GoReleaser and generate the setup-env.sh script
dev:
	goreleaser release --snapshot --skip-publish --rm-dist
	$(MAKE) generate-path-script

# Generate a script to temporarily add the CLI to PATH
generate-path-script:
	@echo '#!/bin/bash' > setup-env.sh
	@echo 'export PATH=$(BUILD_DIR):$$PATH' >> setup-env.sh
	@chmod +x setup-env.sh
	@echo "Run 'source setup-env.sh' to add the CLI to your PATH."
