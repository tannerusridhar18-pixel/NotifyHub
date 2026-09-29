package com.notifyhub.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class RoleService {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final java.util.Set<String> FIXED_ROLE_NAMES = java.util.Set.of(
            "SUPER_ADMIN", "PRINCIPAL", "DEAN", "HOD", "DEPARTMENT_ADMIN", "FACULTY", "STUDENT"
    );

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public RoleService(RoleRepository roleRepository, UserRepository userRepository) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<RoleDto> listRoles() {
        return roleRepository.findAllByOrderByLevelAsc().stream().map(RoleDto::from).toList();
    }

    @Transactional(readOnly = true)
    public RoleEntity getRole(Long id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found."));
    }

    @Transactional(readOnly = true)
    public RoleEntity getRoleByName(String name) {
        return roleRepository.findByNameIgnoreCase(name)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found: " + name));
    }

    public RoleDto createRole(String creatorUsername, CreateRoleRequest request) {
        String normalizedName = request.name().trim().toUpperCase().replace(' ', '_');
        if (roleRepository.existsByNameIgnoreCase(normalizedName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Role with name '" + normalizedName + "' already exists.");
        }
        if (request.level() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role level must be non-negative.");
        }
        if (request.level() == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Level 0 is reserved for Super Admin.");
        }

        User creator = userRepository.findByUsername(creatorUsername)
                .orElseGet(() -> userRepository.findByEmailIgnoreCase(creatorUsername).orElse(null));

        RoleEntity parentRole = null;
        if (request.parentRoleId() != null) {
            parentRole = roleRepository.findById(request.parentRoleId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent role not found."));
        }

        String canPostToJson = "[]";
        try {
            canPostToJson = MAPPER.writeValueAsString(request.canPostTo() != null ? request.canPostTo() : List.of());
        } catch (Exception ignored) {}

        RoleEntity role = new RoleEntity(normalizedName, request.level(), parentRole, creator, canPostToJson);
        return RoleDto.from(roleRepository.save(role));
    }

    public void deleteRole(Long id) {
        RoleEntity role = getRole(id);
        if (FIXED_ROLE_NAMES.contains(role.getName().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fixed system roles cannot be deleted.");
        }

        Number assignedUsers = (Number) entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM users WHERE role_id = ?1"
        ).setParameter(1, id).getSingleResult();
        if (assignedUsers.longValue() > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Role cannot be deleted while users are assigned to it. Reassign those users first.");
        }

        entityManager.createNativeQuery("DELETE FROM user_role_assignments WHERE role_id = ?1")
                .setParameter(1, id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM role_permissions WHERE role_id = ?1")
                .setParameter(1, id).executeUpdate();
        roleRepository.delete(role);
        roleRepository.flush();
    }

    public RoleDto updateRole(Long id, UpdateRoleRequest request) {
        RoleEntity role = getRole(id);
        if (role.isSystemRole()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "System roles cannot be edited.");
        }
        if (request.level() != null && request.level() == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Level 0 is reserved for Super Admin.");
        }
        if (role.getLevel() == 0 && request.level() != null && request.level() != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Super Admin level cannot be altered.");
        }

        if (request.name() != null && !request.name().isBlank()) {
            String newName = request.name().trim().toUpperCase().replace(' ', '_');
            if (!newName.equalsIgnoreCase(role.getName()) && roleRepository.existsByNameIgnoreCase(newName)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Role with name '" + newName + "' already exists.");
            }
            role.setName(newName);
        }

        if (request.level() != null) {
            if (request.level() < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role level must be non-negative.");
            role.setLevel(request.level());
        }

        if (request.parentRoleId() != null) {
            if (request.parentRoleId().equals(role.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A role cannot be its own parent.");
            }
            RoleEntity parent = roleRepository.findById(request.parentRoleId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent role not found."));
            role.setParentRole(parent);
        }

        if (request.canPostTo() != null) {
            try {
                role.setCanPostTo(MAPPER.writeValueAsString(request.canPostTo()));
            } catch (Exception ignored) {}
        }

        return RoleDto.from(roleRepository.save(role));
    }

    public record CreateRoleRequest(String name, Integer level, Long parentRoleId, List<Integer> canPostTo) {}
    public record UpdateRoleRequest(String name, Integer level, Long parentRoleId, List<Integer> canPostTo) {}

    public record RoleDto(Long id, String name, int level, Long parentRoleId, String parentRoleName, String createdBy, List<Integer> canPostTo, Instant createdAt, Instant updatedAt) {
        public static RoleDto from(RoleEntity entity) {
            return new RoleDto(
                    entity.getId(),
                    entity.getName(),
                    entity.getLevel(),
                    entity.getParentRole() != null ? entity.getParentRole().getId() : null,
                    entity.getParentRole() != null ? entity.getParentRole().getName() : null,
                    entity.getCreatedBy() != null ? entity.getCreatedBy().getUsername() : null,
                    entity.parseCanPostToLevels(),
                    entity.getCreatedAt(),
                    entity.getUpdatedAt()
            );
        }
    }
}
