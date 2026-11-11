const admin = ["admin"];

export const permissions = {
  patients: {
    read: ["admin", "doctor", "nurse", "receptionist"],
    create: ["admin", "receptionist"],
    update: ["admin", "doctor", "nurse", "receptionist"],
    delete: admin,
  },
  doctors: {
    read: ["admin", "doctor", "nurse", "receptionist", "patient"],
    create: [],
    update: admin,
    delete: admin,
  },
  appointments: {
    read: ["admin", "doctor", "receptionist", "patient"],
    create: [],
    update: ["admin", "doctor", "receptionist"],
    delete: admin,
  },
  prescriptions: {
    read: ["admin", "doctor", "pharmacist", "patient"],
    create: [],
    update: [],
    delete: admin,
  },
  medicines: {
    read: ["admin", "doctor", "pharmacist"],
    create: ["admin", "pharmacist"],
    update: ["admin", "pharmacist"],
    delete: admin,
  },
  "lab-tests": {
    read: ["admin", "doctor", "lab"],
    create: [],
    update: [],
    delete: admin,
  },
  beds: {
    read: ["admin", "doctor", "nurse"],
    create: admin,
    update: ["admin", "nurse"],
    delete: admin,
  },
  bills: {
    read: ["admin", "receptionist", "accountant", "patient"],
    create: ["admin", "accountant"],
    update: ["admin", "accountant"],
    delete: admin,
  },
};
