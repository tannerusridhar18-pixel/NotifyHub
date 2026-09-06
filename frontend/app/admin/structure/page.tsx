"use client";

import { useEffect, useState } from "react";
import { createStructureBlock, createStructureBranch, createStructureDepartment, createStructureHostel, createStructureRoom, createStructureSection, structureBlocks, structureBranches, structureDepartments, structureHostels, structureRooms, structureSections } from "@/lib/api";
import type { StructureBlock, StructureBranch, StructureDepartment, StructureHostel, StructureRoom, StructureSection } from "@/lib/api";

export default function StructurePage() {
  const [departments, setDepartments] = useState<StructureDepartment[]>([]);
  const [branches, setBranches] = useState<StructureBranch[]>([]);
  const [sections, setSections] = useState<StructureSection[]>([]);
  const [hostels, setHostels] = useState<StructureHostel[]>([]);
  const [blocks, setBlocks] = useState<StructureBlock[]>([]);
  const [rooms, setRooms] = useState<StructureRoom[]>([]);
  const [message, setMessage] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [branch, setBranch] = useState({ departmentId: "", name: "", maxYear: "4" });
  const [section, setSection] = useState({ departmentId: "", branchId: "", academicYear: "1", name: "" });
  const [hostel, setHostel] = useState({ name: "", type: "", totalCapacity: "" });
  const [block, setBlock] = useState({ hostelId: "", name: "", capacity: "" });
  const [room, setRoom] = useState({ blockId: "", roomNumber: "", floor: "", capacity: "" });

  async function load() {
    const [departmentData, branchData, sectionData, hostelData, blockData, roomData] = await Promise.all([structureDepartments(), structureBranches(), structureSections(), structureHostels(), structureBlocks(), structureRooms()]);
    setDepartments(departmentData); setBranches(branchData); setSections(sectionData); setHostels(hostelData); setBlocks(blockData); setRooms(roomData);
  }
  useEffect(() => {
    let cancelled = false;
    Promise.all([structureDepartments(), structureBranches(), structureSections(), structureHostels(), structureBlocks(), structureRooms()])
      .then(([departmentData, branchData, sectionData, hostelData, blockData, roomData]) => {
        if (cancelled) return;
        setDepartments(departmentData); setBranches(branchData); setSections(sectionData); setHostels(hostelData); setBlocks(blockData); setRooms(roomData);
      })
      .catch(error => { if (!cancelled) setMessage(error instanceof Error ? error.message : "Unable to load structure."); });
    return () => { cancelled = true; };
  }, []);
  async function run(action: () => Promise<unknown>) { try { await action(); await load(); setMessage("Saved."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save."); } }

  return <section className="page">
    <span className="kicker">Admin management</span><h1>Academic & hostel structure</h1><p className="lead">Maintain the normalized structure used by campus identity and future targeting.</p>{message && <div className="success-box">{message}</div>}
    <div className="grid grid-2">
      <StructureCard title="Department"><form onSubmit={event => { event.preventDefault(); void run(() => createStructureDepartment(departmentName)); setDepartmentName(""); }}><input required className="input" placeholder="Department name" value={departmentName} onChange={event => setDepartmentName(event.target.value)} /><button className="button">Add department</button></form><List values={departments.map(item => `${item.name}${item.active ? "" : " (inactive)"}`)} /></StructureCard>
      <StructureCard title="Branch"><form onSubmit={event => { event.preventDefault(); void run(() => createStructureBranch({ departmentId: Number(branch.departmentId), name: branch.name, maxYear: Number(branch.maxYear) })); }}><select required className="select" value={branch.departmentId} onChange={event => setBranch({ ...branch, departmentId: event.target.value })}><option value="">Department</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input required className="input" placeholder="Branch / program" value={branch.name} onChange={event => setBranch({ ...branch, name: event.target.value })} /><input required className="input" type="number" min="1" placeholder="Maximum year" value={branch.maxYear} onChange={event => setBranch({ ...branch, maxYear: event.target.value })} /><button className="button">Add branch</button></form><List values={branches.map(item => `${item.name} · ${item.maxYear} years`)} /></StructureCard>
      <StructureCard title="Section"><form onSubmit={event => { event.preventDefault(); void run(() => createStructureSection({ departmentId: Number(section.departmentId), branchId: Number(section.branchId), academicYear: Number(section.academicYear), name: section.name })); }}><select required className="select" value={section.departmentId} onChange={event => setSection({ ...section, departmentId: event.target.value, branchId: "" })}><option value="">Department</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select required className="select" value={section.branchId} onChange={event => setSection({ ...section, branchId: event.target.value })}><option value="">Branch</option>{branches.filter(item => String(item.departmentId) === section.departmentId).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input required className="input" type="number" min="1" value={section.academicYear} onChange={event => setSection({ ...section, academicYear: event.target.value })} /><input required className="input" placeholder="Section name" value={section.name} onChange={event => setSection({ ...section, name: event.target.value })} /><button className="button">Add section</button></form><List values={sections.map(item => `${item.name} · Year ${item.academicYear}`)} /></StructureCard>
      <StructureCard title="Hostel"><form onSubmit={event => { event.preventDefault(); void run(() => createStructureHostel({ name: hostel.name, type: hostel.type, totalCapacity: hostel.totalCapacity ? Number(hostel.totalCapacity) : undefined })); }}><input required className="input" placeholder="Hostel name" value={hostel.name} onChange={event => setHostel({ ...hostel, name: event.target.value })} /><input className="input" placeholder="Type" value={hostel.type} onChange={event => setHostel({ ...hostel, type: event.target.value })} /><input className="input" type="number" min="0" placeholder="Capacity" value={hostel.totalCapacity} onChange={event => setHostel({ ...hostel, totalCapacity: event.target.value })} /><button className="button">Add hostel</button></form><List values={hostels.map(item => `${item.name}${item.type ? ` · ${item.type}` : ""}`)} /></StructureCard>
      <StructureCard title="Hostel block"><form onSubmit={event => { event.preventDefault(); void run(() => createStructureBlock({ hostelId: Number(block.hostelId), name: block.name, capacity: block.capacity ? Number(block.capacity) : undefined })); }}><select required className="select" value={block.hostelId} onChange={event => setBlock({ ...block, hostelId: event.target.value })}><option value="">Hostel</option>{hostels.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input required className="input" placeholder="Block name" value={block.name} onChange={event => setBlock({ ...block, name: event.target.value })} /><input className="input" type="number" min="0" placeholder="Capacity" value={block.capacity} onChange={event => setBlock({ ...block, capacity: event.target.value })} /><button className="button">Add block</button></form><List values={blocks.map(item => item.name)} /></StructureCard>
      <StructureCard title="Room"><form onSubmit={event => { event.preventDefault(); void run(() => createStructureRoom({ blockId: Number(room.blockId), roomNumber: room.roomNumber, floor: room.floor ? Number(room.floor) : undefined, capacity: Number(room.capacity) })); }}><select required className="select" value={room.blockId} onChange={event => setRoom({ ...room, blockId: event.target.value })}><option value="">Block</option>{blocks.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input required className="input" placeholder="Room number" value={room.roomNumber} onChange={event => setRoom({ ...room, roomNumber: event.target.value })} /><input className="input" type="number" min="0" placeholder="Floor" value={room.floor} onChange={event => setRoom({ ...room, floor: event.target.value })} /><input required className="input" type="number" min="1" placeholder="Capacity" value={room.capacity} onChange={event => setRoom({ ...room, capacity: event.target.value })} /><button className="button">Add room</button></form><List values={rooms.map(item => `${item.roomNumber} · ${item.currentOccupancy}/${item.capacity}`)} /></StructureCard>
    </div>
  </section>;
}

function StructureCard({ title, children }: { title: string; children: React.ReactNode }) { return <article className="card"><h3>{title}</h3>{children}</article>; }
function List({ values }: { values: string[] }) { return <ul>{values.map((value, index) => <li key={`${value}-${index}`}>{value}</li>)}</ul>; }
