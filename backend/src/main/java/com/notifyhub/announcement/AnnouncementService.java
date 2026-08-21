package com.notifyhub.announcement;

import com.notifyhub.auth.User; import com.notifyhub.auth.UserRepository; import com.notifyhub.common.PageResponse; import org.springframework.data.domain.*; import org.springframework.http.HttpStatus; import org.springframework.stereotype.Service; import org.springframework.web.server.ResponseStatusException;

@Service public class AnnouncementService {
 private final AnnouncementRepository repo; private final UserRepository users; public AnnouncementService(AnnouncementRepository r,UserRepository u){repo=r;users=u;}
 public PageResponse<AnnouncementDto> list(int page,int size,String q,String category,String department,boolean urgent){Pageable p=PageRequest.of(page,size,Sort.by(Sort.Direction.DESC,"publishedAt")); Page<Announcement> x;
  if(urgent)x=repo.findByUrgentTrue(p); else if(q!=null&&!q.isBlank())x=repo.findByTitleContainingIgnoreCaseOrContentContainingIgnoreCase(q,q,p); else if(category!=null&&!category.isBlank()&&department!=null&&!department.isBlank())x=repo.findByCategoryIgnoreCaseAndDepartmentIgnoreCase(category,department,p); else if(category!=null&&!category.isBlank())x=repo.findByCategoryIgnoreCase(category,p); else if(department!=null&&!department.isBlank())x=repo.findByDepartmentIgnoreCase(department,p); else x=repo.findAll(p);
  return PageResponse.from(x.map(AnnouncementDto::from));}
 public AnnouncementDto create(AnnouncementRequest r,String username){User u=user(username);Announcement a=new Announcement();apply(a,r);a.setCreatedBy(u);return AnnouncementDto.from(repo.save(a));}
 public AnnouncementDto update(Long id,AnnouncementRequest r){Announcement a=repo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Announcement not found."));apply(a,r);return AnnouncementDto.from(repo.save(a));}
 public void delete(Long id){if(!repo.existsById(id))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Announcement not found.");repo.deleteById(id);}
 private void apply(Announcement a,AnnouncementRequest r){a.setTitle(r.title());a.setCategory(r.category());a.setDepartment(r.department());a.setContent(r.content());a.setUrgent(r.urgent());}
 private User user(String name){return users.findByUsername(name).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Unauthorized."));}
 public record AnnouncementRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=180)String title,@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=80)String category,@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=100)String department,@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=10000)String content,boolean urgent){}
 public record AnnouncementDto(Long id,String title,String category,String department,String content,boolean urgent,java.time.Instant publishedAt){static AnnouncementDto from(Announcement a){return new AnnouncementDto(a.getId(),a.getTitle(),a.getCategory(),a.getDepartment(),a.getContent(),a.isUrgent(),a.getPublishedAt());}}
}
