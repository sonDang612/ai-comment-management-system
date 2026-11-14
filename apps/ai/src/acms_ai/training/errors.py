from http import HTTPStatus

from acms_ai.core.errors import AppError, ErrorCode


class TrainingConfigError(AppError):
    status_code = HTTPStatus.BAD_REQUEST
    code = ErrorCode.BAD_REQUEST
    message = "Invalid training configuration"


class TrainingDataError(AppError):
    status_code = HTTPStatus.UNPROCESSABLE_ENTITY
    code = ErrorCode.VALIDATION_ERROR
    message = "Invalid training data"


class DataLeakageError(AppError):
    status_code = HTTPStatus.CONFLICT
    code = ErrorCode.CONFLICT
    message = "Data leakage between dataset splits"


class ArtifactMismatchError(AppError):
    status_code = HTTPStatus.CONFLICT
    code = ErrorCode.CONFLICT
    message = "Training artifacts do not match"
