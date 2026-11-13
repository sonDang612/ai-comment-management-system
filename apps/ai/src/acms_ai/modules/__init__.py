"""Feature modules, shared by the server and the worker. Each module `modules/<feature>/` owns:

- `router.py`: HTTP layer only (parse input, call the service, shape the output).
- `schemas.py`: Pydantic request/response models.
- `service.py`: inference logic, reusable by the HTTP API *and* the worker.

This service is stateless: it owns no database. Persistence belongs to the NestJS API.
"""
