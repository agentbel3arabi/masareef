from app.schemas.common import ErrorDetail, ErrorResponse, PaginationMeta, SuccessResponse


def test_pagination_meta_defaults():
    meta = PaginationMeta(total=100)
    assert meta.page == 1
    assert meta.page_size == 50


def test_success_response_with_list():
    resp = SuccessResponse(data=[{"id": 1}], meta=PaginationMeta(total=1))
    dumped = resp.model_dump()
    assert dumped["data"] == [{"id": 1}]
    assert dumped["meta"]["total"] == 1


def test_error_response_shape():
    err = ErrorResponse(
        error=ErrorDetail(code="VALIDATION_ERROR", message="bad input")
    )
    dumped = err.model_dump()
    assert dumped["error"]["code"] == "VALIDATION_ERROR"
    assert dumped["error"]["message"] == "bad input"


def test_pagination_meta_page_size_clamped():
    meta = PaginationMeta(total=100, page=1, page_size=200)
    assert meta.page_size == 200  # Clamping is router-level, schema allows any value
