.PHONY: dev generate-path-script

BUILD_DIR := $(shell pwd)/dist
BIN_NAME := sst
CMD_PATH := ./cmd/sst

# Build the CLI for Linux amd64
dev:
	@echo "Ensuring required directories..."
	mkdir -p $(BUILD_DIR)
	@echo "Running pre-build hooks..."
	go mod tidy
	go build -o $(BUILD_DIR)/bridge/bootstrap ./pkg/platform/bridge
	bash -c 'cd ./pkg/platform && ./scripts/build-functions'
	@echo "Building $(BIN_NAME) for Linux amd64..."
	GOOS=linux GOARCH=amd64 go build -o $(BUILD_DIR)/$(BIN_NAME) $(CMD_PATH)
	$(MAKE) generate-path-script

# Generate a script to temporarily add the CLI to PATH
generate-path-script:
	@echo '#!/bin/bash' > setup-env.sh
	@echo 'export PATH=$(BUILD_DIR):$$PATH' >> setup-env.sh
	@chmod +x setup-env.sh
	@echo "Run 'source setup-env.sh' to add the CLI to your PATH."
