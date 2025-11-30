# Domain Package - Coding Guidelines

## Import Conventions

### Use Relative Paths
Always use relative paths (`../`, `../../`) for imports within the domain package:

```typescript
// ✅ Correct
import { Project } from '../../entities';
import { IProjectRepository } from '../../repositories';
import { CreateProjectUseCase } from '../../usecases';

// ❌ Wrong
import { Project } from '@domain/entities';
```

### Folder-Level Imports
Import from folder index files, not individual files:

```typescript
// ✅ Correct
import { Datasource } from '../entities';
import { IUserRepository } from '../repositories';

// ❌ Wrong
import { Datasource } from '../entities/datasource.type.ts';
import { IUserRepository } from '../repositories/user-repository.port.ts';
```

This pattern facilitates folder maintenance and reorganization. Each folder exports via `index.ts`.

## Clean Architecture Pattern

### Layer Structure

1. **Entities** (`entities/`)
   - Domain models and types
   - Business logic and validation
   - Example: `User`, `Project`, `Datasource`

2. **Repositories** (`repositories/`)
   - Ports/interfaces for data access
   - Abstract contracts, not implementations
   - Example: `IUserRepository`, `IProjectRepository`

3. **Usecases** (`usecases/`)
   - Interface definitions for business operations
   - Input/Output DTOs
   - Example: `CreateProjectUseCase`, `GetProjectUseCase`

4. **Services** (`services/`)
   - Implementations of use cases
   - Use repositories to access data
   - Contain business logic orchestration
   - Example: `CreateProjectService` implements `CreateProjectUseCase`

### Dependency Flow

```
Services → Repositories (ports) → Entities
Services → Usecases (interfaces)
```

Services depend on repository ports and implement usecase interfaces. Repositories depend on entities.

## External Domain Access

**Always use usecases to access domain objects from external packages.**

```typescript
// ✅ Correct - External package using usecase
import { CreateProjectUseCase } from '@domain/usecases';
const service = new CreateProjectService(repository);
await service.execute(input);

// ❌ Wrong - Direct repository access
import { IProjectRepository } from '@domain/repositories';
await repository.create(project); // Bypasses business logic
```

Usecases encapsulate business logic. Direct repository access bypasses validation, authorization, and other domain rules.

