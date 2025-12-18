import React, { useRef, useEffect } from 'react';

const ChatWindow = ({ conversation, messages, loading, onLoadMore, loadingMore, isPopup = false }) => {
  const bottomRef = useRef();
  const chatWindowRef = useRef();
  const previousScrollHeight = useRef(0);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (loadingMore) {
      previousScrollHeight.current = chatWindowRef.current.scrollHeight;
    } else if (previousScrollHeight.current > 0) {
      const newScrollHeight = chatWindowRef.current.scrollHeight;
      chatWindowRef.current.scrollTop += newScrollHeight - previousScrollHeight.current;
      previousScrollHeight.current = 0;
    }
  }, [loadingMore, messages.length]);

  useEffect(() => {
    const handleScroll = () => {
      //console.log('Scroll top:', chatWindowRef.current.scrollTop);
      if (chatWindowRef.current && chatWindowRef.current.scrollTop === 0 && onLoadMore && !loadingMore) {
        console.log('Loading more messages');
        onLoadMore();
      }
    };
    const element = chatWindowRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [onLoadMore, loadingMore]);

  if (!conversation) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', background: '#f8f9fa', fontSize: '18px' }}>
      <div className="text-center">
        <i className="fas fa-comments" style={{ fontSize: '48px', color: '#2ECCB6', marginBottom: '16px' }}></i>
        <p>Chọn một cuộc trò chuyện để bắt đầu nhắn tin</p>
      </div>
    </div>
  );
 const chatWindowStyle = isPopup
    ? {
        height: '375px',
        overflowY: 'auto',
        padding: '16px',
        background: '#f8f9fa',
        display: 'flex',
        flexDirection: 'column',
      }
    : {
        flex: 1,
        overflowY: 'scroll',
        padding: '16px',
        background: '#f8f9fa',
        display: 'flex',
        flexDirection: 'column',
      };
  return (
    <div ref={chatWindowRef} style={chatWindowStyle}>
      {loadingMore && (
        <div className="text-center" style={{ padding: '10px' }}>
          <div className="spinner-border" style={{ color: '#2ECCB6', width: '20px', height: '20px' }} role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p style={{ marginTop: '5px', color: '#666', fontSize: '12px' }}>Đang tải tin nhắn cũ hơn...</p>
        </div>
      )}
      {loading ? (
        <div className="text-center" style={{ padding: '20px' }}>
          <div className="spinner-border" style={{ color: '#2ECCB6' }} role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p style={{ marginTop: '10px', color: '#666' }}>Đang tải tin nhắn...</p>
        </div>
      ) : null}
      <div style={{ paddingBottom: '16px' }}>
        {(() => {
          const currentUser = JSON.parse(localStorage.getItem('user'));
           const sortedMessages = [...messages].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
          return sortedMessages.map(msg => {
            const isMine = msg.senderId === currentUser?.userId;
            const isReceptionistOther = msg.senderRoleName === 'Receptionist' && !isMine;
            const isRightSide = isMine || isReceptionistOther;
            return (
              <div key={msg.messageId} style={{ marginBottom: '16px', display: 'flex', justifyContent: isRightSide ? 'flex-end' : 'flex-start' }}>
                {!isRightSide && (
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#ddd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: '16px',
                    marginRight: '8px',
                    marginTop: 'auto'
                  }}>
                    <i className="fas fa-user"></i>
                  </div>
                )}
                <div style={{
                  maxWidth: '60%',
                  background: isMine ? '#2ECCB6' : isReceptionistOther ? '#ffeaa7' : '#ffffff',
                  color: isMine ? '#ffffff' : '#333',
                  padding: '12px 16px',
                  borderRadius: isRightSide ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  wordWrap: 'break-word',
                  position: 'relative'
                }}
                title={`${msg.senderName} (${msg.senderEmail}) - ${new Date(new Date(msg.sentAt).getTime() - 7 * 60 * 60 * 1000).toLocaleDateString('vi-VN')}`}
                >
                  <div>{msg.content}</div>
                  <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px', textAlign: 'right' }}>
                    {new Date(new Date(msg.sentAt).getTime() - 7 * 60 * 60 * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </div>
                </div>
                {isRightSide && (
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isMine ? '#2ECCB6' : '#ddd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isMine ? '#fff' : '#666',
                    fontSize: '16px',
                    marginLeft: '8px',
                    marginTop: 'auto'
                  }}>
                    <i className="fas fa-user"></i>
                  </div>
                )}
              </div>
            );
          });
        })()}
        {messages.length > 0 && messages[messages.length - 1].isRead && (
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#666', marginTop: '8px' }}>
            Đã xem
          </div>
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatWindow;
