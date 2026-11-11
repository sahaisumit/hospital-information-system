import { configs } from "../config/resourceConfig";
import { permissions } from "../config/permissions";
import useResourceData from "../hooks/useResourceData";
import useResourceSelection from "../hooks/useResourceSelection";
import useResourceCrud from "../hooks/useResourceCrud";
import usePatientRegistration from "../hooks/usePatientRegistration";
import useResourceFilter from "../hooks/useResourceFilter";
import useResourceForm from "../hooks/useResourceForm";

import ResourceHeader from "../components/resources/ResourceHeader";
import ResourceToolbar from "../components/resources/ResourceToolbar";
import ResourceTable from "../components/resources/ResourceTable";
import AddResourceModal from "../components/resources/AddResourceModal";
import PatientRegistrationModal from "../components/resources/PatientRegistrationModal";
import DoctorLoginManager from "../components/staff/DoctorLoginManager";
import Pagination from "../components/common/Pagination";
import useListPagination from "../hooks/useListPagination";
import { useMemo, useState } from "react";

function ResourcePage({ type }) {
  const c = configs[type];

  const user = JSON.parse(localStorage.getItem("his_user") || "{}");
  const resourcePermissions = permissions[type] || {};

  const canCreate = resourcePermissions.create?.includes(user.role);
  const canDelete = resourcePermissions.delete?.includes(user.role);

  const {
    show,
    setShow,
    form,
    setForm,
    showPatientForm,
    setShowPatientForm,
    newPatientForm,
    setNewPatientForm,
  } = useResourceForm();

  const { rows, patients, setPatients, doctors, load } = useResourceData(type);

  const { q, setQ, filteredRows } = useResourceFilter(rows);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const resourceRows = useMemo(() => type !== "doctors" ? filteredRows : filteredRows.filter((doctor) => (!departmentFilter || doctor.department === departmentFilter || doctor.department_name === departmentFilter) && (!specializationFilter || doctor.specialization === specializationFilter)), [type, filteredRows, departmentFilter, specializationFilter]);
  const pagination = useListPagination(resourceRows);

  const {
    selected,
    setSelected,
    allVisibleSelected,
    toggleSelect,
    toggleSelectAll,
  } = useResourceSelection(pagination.pageItems);

  const { deleteOne, deleteSelected, save } = useResourceCrud({
    type,
    rows,
    selected,
    setSelected,
    form,
    setShow,
    setForm,
    load,
    canCreate,
    canDelete,
  });

  const { registerPatient } = usePatientRegistration({
    newPatientForm,
    setPatients,
    setForm,
    setShowPatientForm,
    setNewPatientForm,
  });

  return (
    <>
      {type === "doctors" && user.role === "admin" && <DoctorLoginManager doctors={rows} />}
      <ResourceHeader
        c={c}
        setShow={setShow}
        deleteSelected={deleteSelected}
        canCreate={canCreate}
        canDelete={canDelete}
      />

      <ResourceToolbar
        q={q}
        setQ={setQ}
        filteredRows={filteredRows}
        rows={rows}
        departments={type === "doctors" ? [...new Set(rows.map((doctor) => doctor.department || doctor.department_name).filter(Boolean))].sort() : []}
        specializations={type === "doctors" ? [...new Set(rows.map((doctor) => doctor.specialization).filter(Boolean))].sort() : []}
        departmentFilter={departmentFilter}
        setDepartmentFilter={setDepartmentFilter}
        specializationFilter={specializationFilter}
        setSpecializationFilter={setSpecializationFilter}
      />

      <ResourceTable
        c={c}
        filteredRows={pagination.pageItems}
        selected={selected}
        allVisibleSelected={allVisibleSelected}
        toggleSelect={toggleSelect}
        toggleSelectAll={toggleSelectAll}
        deleteOne={deleteOne}
        q={q}
        canDelete={canDelete}
      />
      <div className="overflow-hidden rounded-b-2xl border border-t-0 border-slate-200 bg-white"><Pagination {...pagination} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize}/></div>

      <AddResourceModal
        show={show}
        setShow={setShow}
        save={save}
        c={c}
        type={type}
        form={form}
        setForm={setForm}
        patients={patients}
        doctors={doctors}
        setShowPatientForm={setShowPatientForm}
      />

      <PatientRegistrationModal
        showPatientForm={showPatientForm}
        setShowPatientForm={setShowPatientForm}
        newPatientForm={newPatientForm}
        setNewPatientForm={setNewPatientForm}
        registerPatient={registerPatient}
      />
    </>
  );
}

export default ResourcePage;
