# How to Contribute to Nexgent AI

Thank you for your interest in contributing to Nexgent AI!

## How to Contribute

1. Fork the [Nexgent AI GitHub repository](https://github.com/Nexgent-ai/nexgent-open-source-trading-engine).
2. Create a new branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes following our [development guidelines](#development-guidelines).
4. Submit a pull request to the `main` branch with a clear title and description.
   - Reference any issues fixed, for example `Fixes #1234`.
   - Ensure your PR title follows [semantic commit conventions](https://www.conventionalcommits.org/).
5. A maintainer will review your PR and may request changes.

## Development Environment Setup

For detailed instructions on setting up your local development environment, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## Development Guidelines

### Code Style

- **TypeScript**: Use strict mode and ensure all code is properly typed
- **ESLint**: Follow existing linting rules (`pnpm lint`)
- **Naming**: Use camelCase for variables, PascalCase for classes and components
- **Formatting**: Maintain consistent code formatting

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

Example:
```bash
git commit -m "feat: add stop loss configuration to agent settings"
```

### Before Submitting a PR

- [ ] All tests pass (`pnpm test`)
- [ ] Code is linted (`pnpm lint`)
- [ ] Type checking passes (`pnpm type-check`)
- [ ] Documentation is updated (if needed)
- [ ] Changes are tested manually
- [ ] Commit messages follow conventional commits

## Areas for Contribution

### Backend Contributions

- **API Endpoints**: Add new endpoints in `packages/backend/src/api/v1/`
- **Domain Services**: Business logic in `packages/backend/src/domain/`
- **Infrastructure**: Database, cache, external API integrations
- **Tests**: Unit and integration tests in `packages/backend/tests/`

See [Backend README](./packages/backend/README.md) for detailed architecture documentation.

### Frontend Contributions

- **Features**: Add new features in `packages/frontend/src/features/`
- **Components**: UI components in `packages/frontend/src/shared/components/`
- **API Integration**: API services in `packages/frontend/src/infrastructure/api/`
- **Real-time Updates**: WebSocket integration in `packages/frontend/src/infrastructure/websocket/`

See [Frontend README](./packages/frontend/README.md) for detailed architecture documentation.

### Shared Package Contributions

- **Types**: TypeScript type definitions in `packages/shared/src/types/`
- **Validators**: Zod validation schemas in `packages/shared/src/validators/`
- **Utilities**: Shared utility functions in `packages/shared/src/utils/`

### Testing Contributions

- Add unit tests for new backend services
- Add integration tests for API endpoints
- Improve test coverage in existing areas

## Getting Help

- **GitHub Issues**: [Report bugs or ask questions](https://github.com/Nexgent-ai/nexgent-open-source-trading-engine/issues)
- **Documentation**: Check the `docs/` directory and package README files
- **Code Examples**: Review existing code in `packages/backend/src/api/` and `packages/frontend/src/features/`

## Additional Resources

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete development environment setup
- **[Backend README](./packages/backend/README.md)** - Backend architecture and patterns
- **[Frontend README](./packages/frontend/README.md)** - Frontend architecture and patterns
- **[Security Policy](./SECURITY.md)** - Security guidelines

Thank you for helping improve Nexgent AI! 🚀

