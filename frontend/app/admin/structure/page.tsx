"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  currentUser,
  createStructureDepartment,
  updateStructureDepartment,
  deleteStructureDepartment,
  createStructureBranch,
  updateStructureBranch,
  deleteStructureBranch,
  createStructureSection,
  updateStructureSection,
  deleteStructureSection,
  structureDepartments,
  structureBranches,
  structureSections,
  structureHostels,
  structureBlocks,
  structureRooms,
  createStructureHostel,
  updateStructureHostel,
  deleteStructureHostel,
  createStructureBlock,
  updateStructureBlock,
  deleteStructureBlock,
  createStructureRoom,
  updateStructureRoom,
  deleteStructureRoom,
  type StructureDepartment,
  type StructureBranch,
  type StructureSection,
  type StructureHostel,
  type StructureBlock,
  type StructureRoom,
} from "@/lib/api";
import { Empty, ErrorState } from "@/components/States";
import { Toast } from "@/components/Toast";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Counter from "@/components/ui/Counter";
import { inputBase } from "@/components/ui/classes";

export default function StructurePage() {
  const [departments, setDepartments] = useState<StructureDepartment[]>([]);
  const [branches, setBranches] = useState<StructureBranch[]>([]);
  const [sections, setSections] = useState<StructureSection[]>([]);
  const [hostels, setHostels] = useState<StructureHostel[]>([]);
  const [blocks, setBlocks] = useState<StructureBlock[]>([]);
  const [rooms, setRooms] = useState<StructureRoom[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [d, b, s, h, bl, r] = await Promise.all([structureDepartments(), structureBranches(), structureSections(), structureHostels(), structureBlocks(), structureRooms()]);
      setDepartments(d);
      setBranches(b);
      setSections(s);
      setHostels(h);
      setBlocks(bl);
      setRooms(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load academic structure.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await currentUser();
        if (alive && (!u || u.roleLevel !== 0)) router.replace("/");
        else if (alive) await load();
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Unable to verify admin access.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [load, router]);

  const mutate = useCallback(
    async (fn: () => Promise<unknown>, message: string) => {
      try {
        await fn();
        await load();
        setToast({ message, type: "success" });
      } catch (e) {
        const m = e instanceof Error ? e.message : "Operation failed.";
        setError(m);
        setToast({ message: m, type: "error" });
      }
    },
    [load]
  );

  const activeDepartments = departments.filter((x) => x.active);
  const activeBranches = branches.filter((x) => x.active);
  const activeSections = sections.filter((x) => x.active);
  const activeHostels = hostels.filter((x) => x.active);
  const activeBlocks = blocks.filter((x) => x.active);
  const activeRooms = rooms.filter((x) => x.active);

  if (loading)
    return (
      <div className="mx-auto w-full max-w-[1450px] px-4 py-10">
        <div className="rounded-[18px] border border-border bg-surface py-20 text-center shadow-soft">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 font-extrabold text-brand animate-spin-slow">N</div>
          <h2 className="text-xl">Loading structure</h2>
          <p className="text-muted">Reading departments, programs and residential placement records.</p>
        </div>
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-[1450px] px-4 py-8 sm:px-8 sm:py-10 lg:px-[clamp(20px,4vw,60px)]">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <header className="mb-7 flex flex-col items-start justify-between gap-6 sm:flex-row">
        <div>
          <span className="text-[11px] font-extrabold text-brand">Campus model</span>
          <h1 className="mt-1.5 text-[32px] leading-tight sm:text-4xl lg:text-[46px]">Structure manager</h1>
          <p className="mt-2.5 max-w-[650px] text-[13px] leading-relaxed text-muted">Create, edit and deactivate the names that power invitations and audience targeting.</p>
        </div>
        <div className="grid min-w-[130px] gap-1 rounded-2xl border border-border bg-surface p-4">
          <strong className="font-display text-2xl"><Counter value={activeDepartments.length + activeHostels.length} /></strong>
          <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Top-level locations</span>
        </div>
      </header>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      <div className="grid gap-3.5 md:grid-cols-2">
        <DepartmentCard
          items={activeDepartments}
          onCreate={(name) => mutate(() => createStructureDepartment(name), "Department created.")}
          onEdit={(x, name) => mutate(() => updateStructureDepartment(x.id, { name, active: true }), "Department updated.")}
          onDelete={(x) => mutate(() => deleteStructureDepartment(x.id), "Department deactivated.")}
        />
        <BranchCard
          items={activeBranches}
          departments={activeDepartments}
          onCreate={(p) => mutate(() => createStructureBranch(p), "Branch created.")}
          onEdit={(x, p) => mutate(() => updateStructureBranch(x.id, p), "Branch updated.")}
          onDelete={(x) => mutate(() => deleteStructureBranch(x), "Branch deactivated.")}
        />
        <SectionCard
          items={activeSections}
          departments={activeDepartments}
          branches={activeBranches}
          onCreate={(p) => mutate(() => createStructureSection(p), "Section created.")}
          onEdit={(x, p) => mutate(() => updateStructureSection(x.id, p), "Section updated.")}
          onDelete={(x) => mutate(() => deleteStructureSection(x), "Section deactivated.")}
        />
        <HostelCard
          items={activeHostels}
          onCreate={(p) => mutate(() => createStructureHostel(p), "Hostel created.")}
          onEdit={(x, p) => mutate(() => updateStructureHostel(x.id, p), "Hostel updated.")}
          onDelete={(x) => mutate(() => deleteStructureHostel(x), "Hostel deactivated.")}
        />
        <BlockCard
          items={activeBlocks}
          hostels={activeHostels}
          onCreate={(p) => mutate(() => createStructureBlock(p), "Block created.")}
          onEdit={(x, p) => mutate(() => updateStructureBlock(x.id, p), "Block updated.")}
          onDelete={(x) => mutate(() => deleteStructureBlock(x), "Block deactivated.")}
        />
        <RoomCard
          items={activeRooms}
          blocks={activeBlocks}
          onCreate={(p) => mutate(() => createStructureRoom(p), "Room created.")}
          onEdit={(x, p) => mutate(() => updateStructureRoom(x.id, p), "Room updated.")}
          onDelete={(x) => mutate(() => deleteStructureRoom(x), "Room deactivated.")}
        />
      </div>
    </div>
  );
}

function Shell({ number, title, subtitle, count, children }: { number: string; title: string; subtitle: string; count: number; children: React.ReactNode }) {
  return (
    <article className="min-w-0 rounded-[22px] border border-white/10 bg-gradient-to-br from-surface/95 via-surface-2/90 to-surface/95 p-6 shadow-soft backdrop-blur-xl transition-all duration-300 hover:border-brand-light/40 hover:shadow-card-hover">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand-50/90 px-2.5 py-0.5 text-[9px] font-black tracking-[0.16em] text-brand-light uppercase">{number}</span>
          <h2 className="mt-2 text-xl font-extrabold">{title}</h2>
          <p className="mt-0.5 text-[11px] font-semibold text-muted">{subtitle}</p>
        </div>
        <strong className="font-display text-2xl font-extrabold text-brand-light bg-surface-2/90 px-3 py-1 rounded-xl border border-white/[0.06] shadow-sm"><Counter value={count} /></strong>
      </div>
      {children}
    </article>
  );
}

function Row({ children, onEdit, onDelete }: { children: React.ReactNode; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl p-2.5 transition-all duration-200 hover:bg-surface-2/90 hover:shadow-sm">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <button className="rounded-lg border border-brand/40 bg-brand-50 px-2.5 py-1.5 text-[9px] font-extrabold text-brand-light hover:bg-brand-50/80 transition-colors" onClick={onEdit} aria-label="Edit">
          Edit
        </button>
        <button className="rounded-lg border border-danger/40 bg-danger-soft px-2.5 py-1.5 text-[9px] font-extrabold text-[#ff8ba0] hover:bg-danger-soft/80 transition-colors" onClick={onDelete} aria-label="Deactivate">
          Delete
        </button>
      </div>
    </div>
  );
}


function DepartmentCard({
  items,
  onCreate,
  onEdit,
  onDelete,
}: {
  items: StructureDepartment[];
  onCreate: (name: string) => void;
  onEdit: (x: StructureDepartment, name: string) => void;
  onDelete: (x: StructureDepartment) => void;
}) {
  const [name, setName] = useState("");
  return (
    <Shell number="01" title="Departments" subtitle="Academic owners" count={items.length}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            onCreate(name.trim());
            setName("");
          }
        }}
      >
        <Field label="Department name" htmlFor="dept-name" className="mb-3">
          <input id="dept-name" required className={inputBase} value={name} onChange={(e) => setName(e.target.value)} placeholder="Computer Science" />
        </Field>
        <Button className="w-full sm:w-auto">Add department</Button>
      </form>
      <List items={items} label="departments">
        {(x) => (
          <Row
            onEdit={() => {
              const v = prompt("Department name", x.name);
              if (v?.trim()) onEdit(x, v.trim());
            }}
            onDelete={() => onDelete(x)}
          >
            <strong className="block truncate text-[10px]">{x.name}</strong>
            <small className="block text-[8px] text-muted">Active</small>
          </Row>
        )}
      </List>
    </Shell>
  );
}

function BranchCard({
  items,
  departments,
  onCreate,
  onEdit,
  onDelete,
}: {
  items: StructureBranch[];
  departments: StructureDepartment[];
  onCreate: (p: { departmentId: number; name: string; courseNote?: string; maxYear: number }) => void;
  onEdit: (x: StructureBranch, p: { departmentId: number; name: string; courseNote?: string; maxYear: number; active?: boolean }) => void;
  onDelete: (x: StructureBranch) => void;
}) {
  const [f, setF] = useState({ departmentId: "", name: "", courseNote: "", maxYear: "4" });
  return (
    <Shell number="02" title="Branches" subtitle="Programs under departments" count={items.length}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (f.departmentId && f.name) onCreate({ departmentId: Number(f.departmentId), name: f.name, courseNote: f.courseNote || undefined, maxYear: Number(f.maxYear) });
        }}
      >
        <Field label="Department" htmlFor="branch-dept" className="mb-3">
          <select id="branch-dept" required className={inputBase} value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value })}>
            <option value="">Choose department</option>
            {departments.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Branch name" htmlFor="branch-name" className="mb-3">
          <input id="branch-name" required className={inputBase} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="B.Tech CSE" />
        </Field>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <Field label="Max year" htmlFor="branch-maxyear">
            <input id="branch-maxyear" required min="1" type="number" className={inputBase} value={f.maxYear} onChange={(e) => setF({ ...f, maxYear: e.target.value })} />
          </Field>
          <Field label="Course note" htmlFor="branch-note">
            <input id="branch-note" className={inputBase} value={f.courseNote} onChange={(e) => setF({ ...f, courseNote: e.target.value })} />
          </Field>
        </div>
        <Button className="w-full sm:w-auto">Add branch</Button>
      </form>
      <List items={items} label="branches">
        {(x) => (
          <Row
            onEdit={() => {
              const name = prompt("Branch name", x.name);
              if (name?.trim()) onEdit(x, { departmentId: x.departmentId, name: name.trim(), courseNote: x.courseNote || undefined, maxYear: x.maxYear, active: true });
            }}
            onDelete={() => onDelete(x)}
          >
            <strong className="block truncate text-[10px]">{x.name}</strong>
            <small className="block text-[8px] text-muted">
              {departments.find((d) => d.id === x.departmentId)?.name || "Department"} · max year {x.maxYear}
            </small>
          </Row>
        )}
      </List>
    </Shell>
  );
}

function SectionCard({
  items,
  departments,
  branches,
  onCreate,
  onEdit,
  onDelete,
}: {
  items: StructureSection[];
  departments: StructureDepartment[];
  branches: StructureBranch[];
  onCreate: (p: { departmentId: number; branchId: number; academicYear: number; name: string }) => void;
  onEdit: (x: StructureSection, p: { departmentId: number; branchId: number; academicYear: number; name: string; active?: boolean }) => void;
  onDelete: (x: StructureSection) => void;
}) {
  const [f, setF] = useState({ departmentId: "", branchId: "", academicYear: "1", name: "" });
  const bs = branches.filter((x) => String(x.departmentId) === f.departmentId);
  return (
    <Shell number="03" title="Sections" subtitle="Class groups" count={items.length}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (f.departmentId && f.branchId && f.name) onCreate({ departmentId: Number(f.departmentId), branchId: Number(f.branchId), academicYear: Number(f.academicYear), name: f.name });
        }}
      >
        <Field label="Department" htmlFor="section-dept" className="mb-3">
          <select id="section-dept" required className={inputBase} value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value, branchId: "" })}>
            <option value="">Choose department</option>
            {departments.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Branch" htmlFor="section-branch" className="mb-3">
          <select id="section-branch" required disabled={!f.departmentId} className={inputBase} value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value })}>
            <option value="">Choose branch</option>
            {bs.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <Field label="Academic year" htmlFor="section-year">
            <input id="section-year" required min="1" type="number" className={inputBase} value={f.academicYear} onChange={(e) => setF({ ...f, academicYear: e.target.value })} />
          </Field>
          <Field label="Section name" htmlFor="section-name">
            <input id="section-name" required className={inputBase} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="A" />
          </Field>
        </div>
        <Button className="w-full sm:w-auto">Add section</Button>
      </form>
      <List items={items} label="sections">
        {(x) => (
          <Row
            onEdit={() => {
              const name = prompt("Section name", x.name);
              if (name?.trim()) onEdit(x, { departmentId: x.departmentId, branchId: x.branchId, academicYear: x.academicYear, name: name.trim(), active: true });
            }}
            onDelete={() => onDelete(x)}
          >
            <strong className="block truncate text-[10px]">{x.name}</strong>
            <small className="block text-[8px] text-muted">
              {branches.find((b) => b.id === x.branchId)?.name || "Branch"} · Year {x.academicYear}
            </small>
          </Row>
        )}
      </List>
    </Shell>
  );
}

function HostelCard({
  items,
  onCreate,
  onEdit,
  onDelete,
}: {
  items: StructureHostel[];
  onCreate: (p: { name: string; type?: string; totalCapacity?: number }) => void;
  onEdit: (x: StructureHostel, p: { name: string; type?: string; totalCapacity?: number; active?: boolean }) => void;
  onDelete: (x: StructureHostel) => void;
}) {
  const [f, setF] = useState({ name: "", type: "", totalCapacity: "" });
  return (
    <Shell number="04" title="Hostels" subtitle="Residential locations" count={items.length}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (f.name) onCreate({ name: f.name, type: f.type || undefined, totalCapacity: f.totalCapacity ? Number(f.totalCapacity) : undefined });
        }}
      >
        <Field label="Hostel name" htmlFor="hostel-name" className="mb-3">
          <input id="hostel-name" required className={inputBase} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <Field label="Type" htmlFor="hostel-type">
            <input id="hostel-type" className={inputBase} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} placeholder="Boys / Girls" />
          </Field>
          <Field label="Capacity" htmlFor="hostel-capacity">
            <input id="hostel-capacity" type="number" min="0" className={inputBase} value={f.totalCapacity} onChange={(e) => setF({ ...f, totalCapacity: e.target.value })} />
          </Field>
        </div>
        <Button className="w-full sm:w-auto">Add hostel</Button>
      </form>
      <List items={items} label="hostels">
        {(x) => (
          <Row
            onEdit={() => {
              const name = prompt("Hostel name", x.name);
              if (name?.trim()) onEdit(x, { name: name.trim(), type: x.type || undefined, totalCapacity: x.totalCapacity || 0, active: true });
            }}
            onDelete={() => onDelete(x)}
          >
            <strong className="block truncate text-[10px]">{x.name}</strong>
            <small className="block text-[8px] text-muted">
              {x.type || "Hostel"} · capacity {x.totalCapacity ?? "—"}
            </small>
          </Row>
        )}
      </List>
    </Shell>
  );
}

function BlockCard({
  items,
  hostels,
  onCreate,
  onEdit,
  onDelete,
}: {
  items: StructureBlock[];
  hostels: StructureHostel[];
  onCreate: (p: { hostelId: number; name: string; capacity?: number }) => void;
  onEdit: (x: StructureBlock, p: { hostelId: number; name: string; capacity?: number; active?: boolean }) => void;
  onDelete: (x: StructureBlock) => void;
}) {
  const [f, setF] = useState({ hostelId: "", name: "", capacity: "" });
  return (
    <Shell number="05" title="Hostel blocks" subtitle="Buildings inside hostels" count={items.length}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (f.hostelId && f.name) onCreate({ hostelId: Number(f.hostelId), name: f.name, capacity: f.capacity ? Number(f.capacity) : undefined });
        }}
      >
        <Field label="Hostel" htmlFor="block-hostel" className="mb-3">
          <select id="block-hostel" required className={inputBase} value={f.hostelId} onChange={(e) => setF({ ...f, hostelId: e.target.value })}>
            <option value="">Choose hostel</option>
            {hostels.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <Field label="Block name" htmlFor="block-name">
            <input id="block-name" required className={inputBase} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Capacity" htmlFor="block-capacity">
            <input id="block-capacity" type="number" min="0" className={inputBase} value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} />
          </Field>
        </div>
        <Button className="w-full sm:w-auto">Add block</Button>
      </form>
      <List items={items} label="hostel blocks">
        {(x) => (
          <Row
            onEdit={() => {
              const name = prompt("Block name", x.name);
              if (name?.trim()) onEdit(x, { hostelId: x.hostelId, name: name.trim(), capacity: x.capacity || 0, active: true });
            }}
            onDelete={() => onDelete(x)}
          >
            <strong className="block truncate text-[10px]">{x.name}</strong>
            <small className="block text-[8px] text-muted">
              {hostels.find((h) => h.id === x.hostelId)?.name || "Hostel"} · capacity {x.capacity ?? "—"}
            </small>
          </Row>
        )}
      </List>
    </Shell>
  );
}

function RoomCard({
  items,
  blocks,
  onCreate,
  onEdit,
  onDelete,
}: {
  items: StructureRoom[];
  blocks: StructureBlock[];
  onCreate: (p: { blockId: number; roomNumber: string; floor?: number; capacity: number }) => void;
  onEdit: (x: StructureRoom, p: { blockId: number; roomNumber: string; floor?: number; capacity: number; active?: boolean }) => void;
  onDelete: (x: StructureRoom) => void;
}) {
  const [f, setF] = useState({ blockId: "", roomNumber: "", floor: "", capacity: "1" });
  return (
    <Shell number="06" title="Rooms" subtitle="Final residential placement" count={items.length}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (f.blockId && f.roomNumber) onCreate({ blockId: Number(f.blockId), roomNumber: f.roomNumber, floor: f.floor ? Number(f.floor) : undefined, capacity: Number(f.capacity) });
        }}
      >
        <Field label="Block" htmlFor="room-block" className="mb-3">
          <select id="room-block" required className={inputBase} value={f.blockId} onChange={(e) => setF({ ...f, blockId: e.target.value })}>
            <option value="">Choose block</option>
            {blocks.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <Field label="Room number" htmlFor="room-number">
            <input id="room-number" required className={inputBase} value={f.roomNumber} onChange={(e) => setF({ ...f, roomNumber: e.target.value })} />
          </Field>
          <Field label="Floor" htmlFor="room-floor">
            <input id="room-floor" type="number" min="0" className={inputBase} value={f.floor} onChange={(e) => setF({ ...f, floor: e.target.value })} />
          </Field>
        </div>
        <Field label="Capacity" htmlFor="room-capacity" className="mb-3">
          <input id="room-capacity" required min="1" type="number" className={inputBase} value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} />
        </Field>
        <Button className="w-full sm:w-auto">Add room</Button>
      </form>
      <List items={items} label="rooms">
        {(x) => (
          <Row
            onEdit={() => {
              const name = prompt("Room number", x.roomNumber);
              if (name?.trim()) onEdit(x, { blockId: x.blockId, roomNumber: name.trim(), floor: x.floor || 0, capacity: x.capacity, active: true });
            }}
            onDelete={() => onDelete(x)}
          >
            <strong className="block truncate text-[10px]">{x.roomNumber}</strong>
            <small className="block text-[8px] text-muted">
              {blocks.find((b) => b.id === x.blockId)?.name || "Block"} · {x.currentOccupancy}/{x.capacity} occupied
            </small>
          </Row>
        )}
      </List>
    </Shell>
  );
}

function List<T>({ items, label, children }: { items: T[]; label: string; children: (x: T) => React.ReactNode }) {
  return (
    <div className="mt-4 grid max-h-[220px] gap-1 overflow-auto border-t border-border pt-3">
      {items.length ? items.map((x, i) => <div key={i}>{children(x)}</div>) : <Empty label={label} />}
    </div>
  );
}
