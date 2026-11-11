import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

function useLogin(onLogin) {
  const nav = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Registration specific fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("patient");
  const [gender, setGender] = useState("Male");
  const [dob, setDob] = useState("1995-05-15");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [specialization, setSpecialization] = useState("General Medicine");
  const [department, setDepartment] = useState("Medicine");
  const [consultationFee, setConsultationFee] = useState(500);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error("Full name is required");
        if (!email.trim()) throw new Error("Email address is required");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");

        const payload = {
          name,
          email,
          password,
          role,
          phone,
        };

        if (role === "patient") {
          payload.dob = dob;
          payload.gender = gender;
          payload.blood_group = bloodGroup;
          payload.address = address;
          payload.emergency_contact = emergencyContact;
        } else if (role === "doctor") {
          payload.specialization = specialization;
          payload.department = department;
          payload.consultation_fee = Number(consultationFee);
        }

        const d = await api("/auth/register", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        localStorage.setItem("his_token", d.token);
        localStorage.setItem("his_user", JSON.stringify(d.user));

        onLogin(d.token);
        nav("/");
      } else {
        const d = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        localStorage.setItem("his_token", d.token);
        localStorage.setItem("his_user", JSON.stringify(d.user));

        onLogin(d.token);
        nav("/");
      }
    } catch (e) {
      setErr(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return {
    isRegister,
    setIsRegister,
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    phone,
    setPhone,
    role,
    setRole,
    gender,
    setGender,
    dob,
    setDob,
    bloodGroup,
    setBloodGroup,
    address,
    setAddress,
    emergencyContact,
    setEmergencyContact,
    specialization,
    setSpecialization,
    department,
    setDepartment,
    consultationFee,
    setConsultationFee,
    err,
    setErr,
    loading,
    submit,
  };
}

export default useLogin;
