package com.notifyhub.query;

import com.notifyhub.common.PageResponse; import org.springframework.data.domain.*; import org.springframework.http.HttpStatus; import org.springframework.stereotype.Service; import org.springframework.web.server.ResponseStatusException; import java.time.Instant;
@Service public class QueryService{
 private final QueryRepository repo;public QueryService(QueryRepository r){repo=r;}
 public void submit(QueryRequest r){CampusQuery q=new CampusQuery();q.setName(r.name());q.setEmail(r.email());q.setDepartment(r.department());q.setSubject(r.subject());q.setMessage(r.message());repo.save(q);}
 public PageResponse<QueryDto> list(int page,int size,QueryStatus status){Pageable p=PageRequest.of(page,size,Sort.by(Sort.Direction.DESC,"createdAt"));Page<CampusQuery>x=status==null?repo.findAll(p):repo.findByStatus(status,p);return PageResponse.from(x.map(QueryDto::from));}
 public QueryDto answer(Long id,String response){CampusQuery q=repo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Query not found."));q.setAdminResponse(response);q.setStatus(QueryStatus.ANSWERED);q.setAnsweredAt(Instant.now());return QueryDto.from(repo.save(q));}
 public record QueryRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=120)String name,@jakarta.validation.constraints.Email @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=190)String email,@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=100)String department,@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=180)String subject,@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=8000)String message){}
 public record AnswerRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=8000)String response){}
 public record QueryDto(Long id,String name,String email,String department,String subject,String message,QueryStatus status,String adminResponse,Instant createdAt,Instant answeredAt){static QueryDto from(CampusQuery q){return new QueryDto(q.getId(),q.getName(),q.getEmail(),q.getDepartment(),q.getSubject(),q.getMessage(),q.getStatus(),q.getAdminResponse(),q.getCreatedAt(),q.getAnsweredAt());}}
}
