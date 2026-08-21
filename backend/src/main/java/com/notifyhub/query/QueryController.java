package com.notifyhub.query;
import com.notifyhub.common.*; import jakarta.validation.Valid; import jakarta.validation.constraints.*; import org.springframework.http.*; import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/queries") public class QueryController{
 private final QueryService service;public QueryController(QueryService s){service=s;}
 @PostMapping public ResponseEntity<ApiResponse<Void>> submit(@Valid@RequestBody QueryService.QueryRequest r){service.submit(r);return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.message("Query submitted successfully."));}
 @GetMapping public ResponseEntity<ApiResponse<PageResponse<QueryService.QueryDto>>> list(@RequestParam(defaultValue="0")@Min(0)int page,@RequestParam(defaultValue="20")@Min(1)@Max(50)int size,@RequestParam(required=false)QueryStatus status){return ResponseEntity.ok(ApiResponse.ok(service.list(page,size,status)));}
 @PostMapping("/{id}/answer") public ResponseEntity<ApiResponse<QueryService.QueryDto>> answer(@PathVariable Long id,@Valid@RequestBody QueryService.AnswerRequest r){return ResponseEntity.ok(ApiResponse.ok(service.answer(id,r.response())));}
}
