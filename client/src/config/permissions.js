export const permissions = {
  patients: {
    create: ["admin", "receptionist", "patient"],
    update: ["admin", "doctor", "nurse", "receptionist", "patient"],
    delete: ["admin"],
  },

  doctors: {
    create: [], // Doctor accounts are provisioned from staff onboarding.
    update: ["admin", "doctor"],
    delete: ["admin"],
  },

  appointments: {
    create: ["admin", "doctor", "receptionist", "patient"],
    update: ["admin", "doctor", "nurse", "receptionist"],
    delete: ["admin"],
  },

  prescriptions: {
    create: ["admin", "doctor"],
    update: ["admin", "doctor"],
    delete: ["admin"],
  },

  medicines: {
    create: ["admin", "pharmacist"],
    update: ["admin", "pharmacist"],
    delete: ["admin"],
  },

  "lab-tests": {
    create: ["admin", "doctor", "lab"],
    update: ["admin", "doctor", "lab"],
    delete: ["admin"],
  },

  beds: {
    create: ["admin"],
    update: ["admin", "nurse"],
    delete: ["admin"],
  },

  bills: {
    create: ["admin", "accountant"],
    update: ["admin", "accountant"],
    delete: ["admin"],
  },
};
