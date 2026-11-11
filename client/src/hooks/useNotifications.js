import { useEffect, useState } from "react";
import { api } from "../lib/api";

function useNotifications(role) {
  const [notifications, setNotifications] = useState({
    lowStock: [],
    expiring: [],
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const canViewNotifications = ["admin", "pharmacist"].includes(role);

  const loadNotifications = async () => {
    if (!canViewNotifications) {
      setNotifications({ lowStock: [], expiring: [] });
      return;
    }

    try {
      const data = await api("/alerts");

      setNotifications({
        lowStock: data.lowStock || [],
        expiring: data.expiring || [],
      });
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [role]);

  const notificationCount =
    notifications.lowStock.length + notifications.expiring.length;

  return {
    notifications,
    showNotifications,
    setShowNotifications,
    loadNotifications,
    notificationCount,
  };
}

export default useNotifications;
