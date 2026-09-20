package com.notifyhub.faculty;

import com.notifyhub.academicstructure.Department;
import com.notifyhub.academicstructure.DepartmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FacultyDepartmentServiceTest {

    @Mock
    private FacultyDepartmentMappingRepository mappingRepository;

    @Mock
    private FacultyProfileRepository facultyProfileRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    private FacultyDepartmentService service;
    private FacultyProfile profile;
    private Department dept1;
    private Department dept2;

    @BeforeEach
    void setUp() {
        service = new FacultyDepartmentService(mappingRepository, facultyProfileRepository, departmentRepository);
        profile = new FacultyProfile();
        dept1 = new Department();
        dept1.setId(1L);
        dept1.setName("Computer Science");
        dept1.setActive(true);

        dept2 = new Department();
        dept2.setId(2L);
        dept2.setName("Electronics");
        dept2.setActive(true);
    }

    @Test
    void configureDepartments_assignsHomeAndSubSuccessfully() {
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(dept1));
        when(departmentRepository.findById(2L)).thenReturn(Optional.of(dept2));
        when(mappingRepository.findByFacultyId(profile.getId())).thenReturn(Collections.emptyList());

        service.configureDepartments(profile, 1L, List.of(2L));

        verify(mappingRepository, times(2)).save(any(FacultyDepartmentMapping.class));
        verify(facultyProfileRepository).save(profile);
        assertThat(profile.getDepartment()).isEqualTo(dept1);
    }

    @Test
    void configureDepartments_failsWhenHomeDeptNotFound() {
        when(departmentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.configureDepartments(profile, 99L, null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("HOME department not found");
    }

    @Test
    void setHomeDepartment_demotesPreviousHomeToSub() {
        FacultyDepartmentMapping prevHome = new FacultyDepartmentMapping(profile, dept1, FacultyDepartmentRelationship.HOME);
        FacultyDepartmentMapping sub = new FacultyDepartmentMapping(profile, dept2, FacultyDepartmentRelationship.SUB);

        when(departmentRepository.findById(2L)).thenReturn(Optional.of(dept2));
        when(mappingRepository.findByFacultyId(profile.getId())).thenReturn(List.of(prevHome, sub));

        service.setHomeDepartment(profile, 2L);

        assertThat(prevHome.getRelationship()).isEqualTo(FacultyDepartmentRelationship.SUB);
        assertThat(sub.getRelationship()).isEqualTo(FacultyDepartmentRelationship.HOME);
        verify(facultyProfileRepository).save(profile);
    }
}
