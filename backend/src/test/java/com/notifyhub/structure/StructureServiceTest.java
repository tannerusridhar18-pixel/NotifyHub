package com.notifyhub.structure;

import com.notifyhub.academicstructure.*;
import com.notifyhub.hostel.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StructureServiceTest {
    @Mock DepartmentRepository departments;
    @Mock BranchRepository branches;
    @Mock SectionRepository sections;
    @Mock HostelRepository hostels;
    @Mock HostelBlockRepository blocks;
    @Mock RoomRepository rooms;
    private StructureService service;

    @BeforeEach void setUp() { service = new StructureService(departments, branches, sections, hostels, blocks, rooms); }

    @Test void duplicateDepartmentIsRejected() {
        when(departments.existsByNameIgnoreCase("CSE")).thenReturn(true);
        assertThatThrownBy(() -> service.createDepartment("CSE"))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("already exists");
        verify(departments, never()).save(any());
    }

    @Test void branchMustBelongToSelectedDepartment() {
        Department department = new Department(); department.setName("CSE");
        Department other = new Department(); other.setName("ECE");
        Branch branch = new Branch(); branch.setDepartment(other); branch.setName("BTech");
        when(departments.findById(1L)).thenReturn(Optional.of(department));
        when(branches.findById(2L)).thenReturn(Optional.of(branch));
        assertThatThrownBy(() -> service.createSection(1L, 2L, 1, "A"))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("does not belong");
    }

    @Test void roomCapacityCannotBeReducedBelowOccupancy() {
        HostelBlock block = new HostelBlock();
        Room room = new Room(); room.setBlock(block); room.setRoomNumber("101"); room.setCapacity(4); room.setCurrentOccupancy(3);
        when(rooms.findById(1L)).thenReturn(Optional.of(room));
        assertThatThrownBy(() -> service.updateRoom(1L, 2L, "101", 1, 2, true))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("current occupancy");
    }
}
