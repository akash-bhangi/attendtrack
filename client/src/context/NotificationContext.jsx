import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const toastIdRef = useRef(0);

  // Remove toast by id
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Show a toast from the top
  const showToast = useCallback(({ type = 'info', message, title, duration = 4000 }) => {
    const id = ++toastIdRef.current;
    
    // Auto title if not provided
    let defaultTitle = '';
    if (!title) {
      if (type === 'success') defaultTitle = 'Success';
      else if (type === 'error') defaultTitle = 'Notice';
      else if (type === 'warning') defaultTitle = 'Attention';
      else defaultTitle = 'AttendTrack Notification';
    }

    const newToast = {
      id,
      type,
      title: title || defaultTitle,
      message,
      duration,
      createdAt: Date.now()
    };

    setToasts((prev) => [newToast, ...prev].slice(0, 4)); // Keep up to 4 toasts max

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const notify = {
    success: (msg, title) => showToast({ type: 'success', message: msg, title: title || 'Action Complete' }),
    error: (msg, title) => showToast({ type: 'error', message: msg, title: title || 'Error' }),
    warning: (msg, title) => showToast({ type: 'warning', message: msg, title: title || 'Warning' }),
    info: (msg, title) => showToast({ type: 'info', message: msg, title: title || 'Notification' }),
    confirm: ({ title = 'Confirm Action', message = 'Are you sure you want to proceed?', confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) => {
      return new Promise((resolve) => {
        setConfirmDialog({
          title,
          message,
          confirmText,
          cancelText,
          isDanger,
          resolve: (result) => {
            setConfirmDialog(null);
            resolve(result);
          }
        });
      });
    }
  };

  // Gracefully intercept native window.alert so even legacy/unhandled alert calls appear as custom top popups
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      // Determine if error or notice
      const str = String(msg || '');
      const isErr = str.toLowerCase().includes('error') || str.toLowerCase().includes('fail');
      const isSuccess = str.toLowerCase().includes('success') || str.toLowerCase().includes('complete') || str.toLowerCase().includes('updated');
      
      const type = isErr ? 'error' : isSuccess ? 'success' : 'info';
      const title = isErr ? 'Attention' : isSuccess ? 'Success' : 'AttendTrack';
      
      showToast({ type, message: str, title, duration: 4500 });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [showToast]);

  return (
    <NotificationContext.Provider value={notify}>
      {children}

      {/* Top Floating Toast Notification Container */}
      {toasts.length > 0 && (
        <div className="toast-top-container" aria-live="polite" role="region">
          {toasts.map((toast) => {
            let iconSvg;
            if (toast.type === 'success') {
              iconSvg = (
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              );
            } else if (toast.type === 'error') {
              iconSvg = (
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              );
            } else if (toast.type === 'warning') {
              iconSvg = (
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              );
            } else {
              iconSvg = (
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              );
            }

            return (
              <div
                key={toast.id}
                className={`toast-card toast-${toast.type}`}
                role="alert"
              >
                <div className={`toast-icon-box toast-icon-${toast.type}`}>
                  {iconSvg}
                </div>
                <div className="toast-content">
                  <div className="toast-title">{toast.title}</div>
                  <div className="toast-message">{toast.message}</div>
                </div>
                <button
                  type="button"
                  className="toast-close-btn"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Close notification"
                >
                  ✕
                </button>
                {toast.duration > 0 && (
                  <div
                    className={`toast-progress-bar toast-progress-${toast.type}`}
                    style={{ animationDuration: `${toast.duration}ms` }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Confirmation Modal (Drops down smoothly from above) */}
      {confirmDialog && (
        <div className="custom-confirm-backdrop">
          <div className="custom-confirm-card" role="dialog" aria-modal="true">
            <div className="custom-confirm-header">
              <div className={`custom-confirm-icon-box ${confirmDialog.isDanger ? 'icon-danger' : 'icon-primary'}`}>
                {confirmDialog.isDanger ? (
                  <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="custom-confirm-title">{confirmDialog.title}</h3>
                <p className="custom-confirm-message">{confirmDialog.message}</p>
              </div>
            </div>

            <div className="custom-confirm-actions">
              <button
                type="button"
                className="custom-confirm-btn-cancel"
                onClick={() => confirmDialog.resolve(false)}
              >
                {confirmDialog.cancelText}
              </button>
              <button
                type="button"
                className={`custom-confirm-btn-submit ${confirmDialog.isDanger ? 'btn-danger-submit' : 'btn-primary-submit'}`}
                onClick={() => confirmDialog.resolve(true)}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
