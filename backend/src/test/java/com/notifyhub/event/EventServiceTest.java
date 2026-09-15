package com.notifyhub.event;
import com.notifyhub.auth.*; import com.notifyhub.targeting.*; import org.junit.jupiter.api.*; import org.junit.jupiter.api.extension.ExtendWith; import org.mockito.*; import org.mockito.junit.jupiter.MockitoExtension; import org.springframework.web.server.ResponseStatusException; import java.time.Instant; import java.util.Optional; import static org.assertj.core.api.Assertions.*;
@ExtendWith(MockitoExtension.class) class EventServiceTest {
 @Mock EventRepository repo; @Mock UserRepository users; @Mock TargetingService targeting; @InjectMocks EventService service;
 @Test void rejectsEndBeforeStart(){Instant now=Instant.now();assertThatThrownBy(()->service.create(new EventService.Request("T","D","L",now,now,TargetType.GLOBAL,null,null,null,null,null,null),"a")).isInstanceOf(ResponseStatusException.class).hasMessageContaining("after start");}
 @Test void cancelIsTerminal(){Event e=new Event();User u=new User();u.setRole(Role.ADMIN);e.setCreatedBy(u);org.mockito.Mockito.when(repo.findById(1L)).thenReturn(Optional.of(e));assertThat(service.cancel(1L).status()).isEqualTo(EventStatus.CANCELLED);assertThatThrownBy(()->service.cancel(1L)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("already cancelled");}
}
