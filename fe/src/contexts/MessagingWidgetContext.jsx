import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const MessagingWidgetContext = createContext(null);

export const MessagingWidgetProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingPartner, setPendingPartner] = useState(null); // { id, name } | null

  const openWidget = useCallback(() => setIsOpen(true), []);
  const closeWidget = useCallback(() => setIsOpen(false), []);
  const toggleWidget = useCallback(() => setIsOpen((value) => !value), []);

  // Mo bong bong chat va yeu cau no tu dong tao/mo hoi thoai voi doi tac nay
  const openChatWith = useCallback((partnerId, partnerName) => {
    if (!partnerId) return;
    setPendingPartner({ id: partnerId, name: partnerName || '' });
    setIsOpen(true);
  }, []);

  const consumePendingPartner = useCallback(() => setPendingPartner(null), []);

  const value = useMemo(
    () => ({
      isOpen,
      pendingPartner,
      openWidget,
      closeWidget,
      toggleWidget,
      openChatWith,
      consumePendingPartner,
    }),
    [isOpen, pendingPartner, openWidget, closeWidget, toggleWidget, openChatWith, consumePendingPartner]
  );

  return (
    <MessagingWidgetContext.Provider value={value}>{children}</MessagingWidgetContext.Provider>
  );
};

export const useMessagingWidget = () => {
  const ctx = useContext(MessagingWidgetContext);
  if (!ctx) throw new Error('useMessagingWidget must be used within MessagingWidgetProvider');
  return ctx;
};

export default MessagingWidgetContext;
