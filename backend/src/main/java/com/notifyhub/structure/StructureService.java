package com.notifyhub.structure;

import com.notifyhub.academicstructure.*;
import com.notifyhub.hostel.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class StructureService {
    private final DepartmentRepository departments;
    private final BranchRepository branches;
    private final SectionRepository sections;
    private final HostelRepository hostels;
    private final HostelBlockRepository blocks;
    private final RoomRepository rooms;

    public StructureService(DepartmentRepository departments, BranchRepository branches, SectionRepository sections,
                            HostelRepository hostels, HostelBlockRepository blocks, RoomRepository rooms) {
        this.departments = departments; this.branches = branches; this.sections = sections;
        this.hostels = hostels; this.blocks = blocks; this.rooms = rooms;
    }

    @Transactional(readOnly = true) public List<DepartmentView> departments() { return departments.findAll().stream().map(DepartmentView::from).toList(); }
    @Transactional public DepartmentView createDepartment(String name) {
        requireText(name, "Department name"); if (departments.existsByNameIgnoreCase(name)) conflict("Department name already exists.");
        Department entity = new Department(); entity.setName(name.trim()); return DepartmentView.from(departments.save(entity));
    }
    @Transactional public DepartmentView updateDepartment(Long id, String name, Boolean active) {
        Department entity = department(id); requireText(name, "Department name");
        if (!entity.getName().equalsIgnoreCase(name.trim()) && departments.existsByNameIgnoreCase(name)) conflict("Department name already exists.");
        entity.setName(name.trim()); if (active != null) entity.setActive(active); return DepartmentView.from(departments.save(entity));
    }
    @Transactional public void deactivateDepartment(Long id) { Department entity = department(id); entity.setActive(false); departments.save(entity); }

    @Transactional(readOnly = true) public List<BranchView> branches() { return branches.findAll().stream().map(BranchView::from).toList(); }
    @Transactional public BranchView createBranch(Long departmentId, String name, String courseNote, int maxYear) {
        Department department = department(departmentId); requireActive(department.isActive(), "Department"); validateMaxYear(maxYear); requireText(name, "Branch name");
        if (branches.existsByDepartmentIdAndNameIgnoreCase(departmentId, name)) conflict("Branch name already exists in this department.");
        Branch entity = new Branch(); entity.setDepartment(department); entity.setName(name.trim()); entity.setCourseNote(courseNote); entity.setMaxYear(maxYear); return BranchView.from(branches.save(entity));
    }
    @Transactional public BranchView updateBranch(Long id, Long departmentId, String name, String courseNote, Integer maxYear, Boolean active) {
        Branch entity = branch(id); Department department = department(departmentId); requireActive(department.isActive(), "Department"); requireText(name, "Branch name"); if (maxYear != null) validateMaxYear(maxYear);
        if ((!java.util.Objects.equals(entity.getDepartment().getId(), departmentId) || !entity.getName().equalsIgnoreCase(name.trim())) && branches.existsByDepartmentIdAndNameIgnoreCase(departmentId, name)) conflict("Branch name already exists in this department.");
        if (maxYear != null && maxYear < entity.getMaxYear() && sections.existsByBranchIdAndAcademicYearGreaterThan(id, maxYear)) conflict("Cannot lower maximum academic year below sections that already exist.");
        entity.setDepartment(department); entity.setName(name.trim()); entity.setCourseNote(courseNote); if (maxYear != null) entity.setMaxYear(maxYear); if (active != null) entity.setActive(active); return BranchView.from(branches.save(entity));
    }

    @Transactional(readOnly = true) public List<SectionView> sections() { return sections.findAll().stream().map(SectionView::from).toList(); }
    @Transactional public SectionView createSection(Long departmentId, Long branchId, int academicYear, String name) {
        Department department = department(departmentId); Branch branch = branch(branchId); requireActive(department.isActive(), "Department"); requireActive(branch.isActive(), "Branch"); validateBranchDepartment(branch, departmentId); validateYear(academicYear, branch); requireText(name, "Section name");
        if (sections.existsByDepartmentIdAndBranchIdAndAcademicYearAndNameIgnoreCase(departmentId, branchId, academicYear, name)) conflict("Section already exists in this academic scope.");
        Section entity = new Section(); entity.setDepartment(department); entity.setBranch(branch); entity.setAcademicYear(academicYear); entity.setName(name.trim()); return SectionView.from(sections.save(entity));
    }
    @Transactional public SectionView updateSection(Long id, Long departmentId, Long branchId, int academicYear, String name, Boolean active) {
        Section entity = section(id); Department department = department(departmentId); Branch branch = branch(branchId); requireActive(department.isActive(), "Department"); requireActive(branch.isActive(), "Branch"); validateBranchDepartment(branch, departmentId); validateYear(academicYear, branch); requireText(name, "Section name");
        boolean changed = !java.util.Objects.equals(entity.getDepartment().getId(), departmentId) || !java.util.Objects.equals(entity.getBranch().getId(), branchId) || entity.getAcademicYear() != academicYear || !entity.getName().equalsIgnoreCase(name.trim());
        if (changed && sections.existsByDepartmentIdAndBranchIdAndAcademicYearAndNameIgnoreCase(departmentId, branchId, academicYear, name)) conflict("Section already exists in this academic scope.");
        entity.setDepartment(department); entity.setBranch(branch); entity.setAcademicYear(academicYear); entity.setName(name.trim()); if (active != null) entity.setActive(active); return SectionView.from(sections.save(entity));
    }

    @Transactional(readOnly = true) public List<HostelView> hostels() { return hostels.findAll().stream().map(HostelView::from).toList(); }
    @Transactional public HostelView createHostel(String name, String type, Integer totalCapacity) {
        requireText(name, "Hostel name"); validateCapacity(totalCapacity); if (hostels.existsByNameIgnoreCase(name)) conflict("Hostel name already exists.");
        Hostel entity = new Hostel(); entity.setName(name.trim()); entity.setType(type); entity.setTotalCapacity(totalCapacity); return HostelView.from(hostels.save(entity));
    }
    @Transactional public HostelView updateHostel(Long id, String name, String type, Integer totalCapacity, Boolean active) {
        Hostel entity = hostel(id); requireText(name, "Hostel name"); validateCapacity(totalCapacity); if (!entity.getName().equalsIgnoreCase(name.trim()) && hostels.existsByNameIgnoreCase(name)) conflict("Hostel name already exists.");
        entity.setName(name.trim()); entity.setType(type); entity.setTotalCapacity(totalCapacity); if (active != null) entity.setActive(active); return HostelView.from(hostels.save(entity));
    }

    @Transactional(readOnly = true) public List<BlockView> blocks() { return blocks.findAll().stream().map(BlockView::from).toList(); }
    @Transactional public BlockView createBlock(Long hostelId, String name, Integer capacity) {
        Hostel hostel = hostel(hostelId); requireActive(hostel.isActive(), "Hostel"); requireText(name, "Block name"); validateCapacity(capacity); if (blocks.existsByHostelIdAndNameIgnoreCase(hostelId, name)) conflict("Block name already exists in this hostel.");
        HostelBlock entity = new HostelBlock(); entity.setHostel(hostel); entity.setName(name.trim()); entity.setCapacity(capacity); return BlockView.from(blocks.save(entity));
    }
    @Transactional public BlockView updateBlock(Long id, Long hostelId, String name, Integer capacity, Boolean active) {
        HostelBlock entity = block(id); Hostel hostel = hostel(hostelId); requireActive(hostel.isActive(), "Hostel"); requireText(name, "Block name"); validateCapacity(capacity);
        if ((!java.util.Objects.equals(entity.getHostel().getId(), hostelId) || !entity.getName().equalsIgnoreCase(name.trim())) && blocks.existsByHostelIdAndNameIgnoreCase(hostelId, name)) conflict("Block name already exists in this hostel.");
        entity.setHostel(hostel); entity.setName(name.trim()); entity.setCapacity(capacity); if (active != null) entity.setActive(active); return BlockView.from(blocks.save(entity));
    }

    @Transactional(readOnly = true) public List<RoomView> rooms() { return rooms.findAll().stream().map(RoomView::from).toList(); }
    @Transactional public RoomView createRoom(Long blockId, String roomNumber, Integer floor, int capacity) {
        HostelBlock block = block(blockId); requireActive(block.isActive(), "Hostel block"); requireActive(block.getHostel().isActive(), "Hostel"); requireText(roomNumber, "Room number"); validatePositive(capacity, "Room capacity"); if (rooms.existsByBlockIdAndRoomNumberIgnoreCase(blockId, roomNumber)) conflict("Room number already exists in this block.");
        Room entity = new Room(); entity.setBlock(block); entity.setRoomNumber(roomNumber.trim()); entity.setFloor(floor); entity.setCapacity(capacity); return RoomView.from(rooms.save(entity));
    }
    @Transactional public RoomView updateRoom(Long id, Long blockId, String roomNumber, Integer floor, Integer capacity, Boolean active) {
        Room entity = room(id); if (capacity != null) validatePositive(capacity, "Room capacity");
        int effectiveCapacity = capacity == null ? entity.getCapacity() : capacity; if (effectiveCapacity < entity.getCurrentOccupancy()) conflict("Room capacity cannot be below current occupancy.");
        HostelBlock block = block(blockId); requireActive(block.isActive(), "Hostel block"); requireActive(block.getHostel().isActive(), "Hostel"); requireText(roomNumber, "Room number");
        if ((!java.util.Objects.equals(entity.getBlock().getId(), blockId) || !entity.getRoomNumber().equalsIgnoreCase(roomNumber.trim())) && rooms.existsByBlockIdAndRoomNumberIgnoreCase(blockId, roomNumber)) conflict("Room number already exists in this block.");
        entity.setBlock(block); entity.setRoomNumber(roomNumber.trim()); entity.setFloor(floor); entity.setCapacity(effectiveCapacity); if (active != null) entity.setActive(active); return RoomView.from(rooms.save(entity));
    }

    private Department department(Long id) { return departments.findById(id).orElseThrow(() -> notFound("Department")); }
    private Branch branch(Long id) { return branches.findById(id).orElseThrow(() -> notFound("Branch")); }
    private Section section(Long id) { return sections.findById(id).orElseThrow(() -> notFound("Section")); }
    private Hostel hostel(Long id) { return hostels.findById(id).orElseThrow(() -> notFound("Hostel")); }
    private HostelBlock block(Long id) { return blocks.findById(id).orElseThrow(() -> notFound("Hostel block")); }
    private Room room(Long id) { return rooms.findById(id).orElseThrow(() -> notFound("Room")); }
    private void validateBranchDepartment(Branch branch, Long departmentId) { if (!java.util.Objects.equals(branch.getDepartment().getId(), departmentId)) throw bad("Branch does not belong to department."); }
    private void validateYear(int year, Branch branch) { if (year < 1 || year > branch.getMaxYear()) throw bad("Academic year is outside the branch range."); }
    private void validateMaxYear(int value) { validatePositive(value, "Maximum academic year"); }
    private void validateCapacity(Integer value) { if (value != null && value < 0) throw bad("Capacity cannot be negative."); }
    private void requireActive(boolean active, String type) { if (!active) throw bad(type + " is inactive."); }
    private void validatePositive(int value, String field) { if (value <= 0) throw bad(field + " must be positive."); }
    private void requireText(String value, String field) { if (value == null || value.isBlank()) throw bad(field + " is required."); }
    private ResponseStatusException notFound(String value) { return new ResponseStatusException(HttpStatus.NOT_FOUND, value + " not found."); }
    private ResponseStatusException bad(String value) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, value); }
    private void conflict(String value) { throw new ResponseStatusException(HttpStatus.CONFLICT, value); }

    public record DepartmentView(Long id, String name, boolean active) { static DepartmentView from(Department e) { return new DepartmentView(e.getId(), e.getName(), e.isActive()); } }
    public record BranchView(Long id, Long departmentId, String name, String courseNote, int maxYear, boolean active) { static BranchView from(Branch e) { return new BranchView(e.getId(), e.getDepartment().getId(), e.getName(), e.getCourseNote(), e.getMaxYear(), e.isActive()); } }
    public record SectionView(Long id, Long departmentId, Long branchId, int academicYear, String name, boolean active) { static SectionView from(Section e) { return new SectionView(e.getId(), e.getDepartment().getId(), e.getBranch().getId(), e.getAcademicYear(), e.getName(), e.isActive()); } }
    public record HostelView(Long id, String name, String type, Integer totalCapacity, boolean active) { static HostelView from(Hostel e) { return new HostelView(e.getId(), e.getName(), e.getType(), e.getTotalCapacity(), e.isActive()); } }
    public record BlockView(Long id, Long hostelId, String name, Integer capacity, boolean active) { static BlockView from(HostelBlock e) { return new BlockView(e.getId(), e.getHostel().getId(), e.getName(), e.getCapacity(), e.isActive()); } }
    public record RoomView(Long id, Long blockId, String roomNumber, Integer floor, int capacity, int currentOccupancy, boolean active) { static RoomView from(Room e) { return new RoomView(e.getId(), e.getBlock().getId(), e.getRoomNumber(), e.getFloor(), e.getCapacity(), e.getCurrentOccupancy(), e.isActive()); } }
}
