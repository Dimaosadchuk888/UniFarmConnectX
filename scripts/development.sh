#!/bin/bash
# Development scripts for UniFarm project

# Lint all TypeScript and JavaScript files
lint() {
    echo "Running ESLint..."
    npx eslint . --ext .js,.jsx,.ts,.tsx
}

# Fix linting issues automatically
lint_fix() {
    echo "Running ESLint with --fix..."
    npx eslint . --ext .js,.jsx,.ts,.tsx --fix
}

# Type check with TypeScript
typecheck() {
    echo "Running TypeScript type checking..."
    npx tsc --noEmit
}

# Analyze circular dependencies
analyze_deps() {
    echo "Analyzing circular dependencies..."
    npx madge --circular modules
}

# Run all checks
check_all() {
    echo "Running all checks..."
    typecheck
    lint
    analyze_deps
}

# Parse command line arguments
case "$1" in
    lint)
        lint
        ;;
    lint:fix)
        lint_fix
        ;;
    typecheck)
        typecheck
        ;;
    analyze:deps)
        analyze_deps
        ;;
    check:all)
        check_all
        ;;
    *)
        echo "Usage: $0 {lint|lint:fix|typecheck|analyze:deps|check:all}"
        exit 1
        ;;
esac