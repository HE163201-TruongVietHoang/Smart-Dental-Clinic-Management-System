import React from 'react';

const ChatList = ({ conversations, selectedConversation, onSelectConversation, unreadCounts }) => {
  // Lấy userId từ localStorage user object
  let currentUserId = 0;
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    currentUserId = user?.userId || 0;
  } catch {
    currentUserId = 0;
  }
  console.log("Current User ID:", currentUserId);
  return (
    <div style={{ width: '350px', borderRight: '1px solid #e0e0e0', overflowY: 'auto', background: '#ffffff' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0', fontWeight: 'bold', fontSize: '18px', color: '#333', background: '#f0f0f0' }}>
        <i className="fas fa-comments" style={{ marginRight: '8px', color: '#2ECCB6' }}></i>
        Trò chuyện
      </div>
      {conversations.map(conv => {
        const otherId = conv.participant1Id === currentUserId ? conv.participant2Id : conv.participant1Id;
        const otherName = conv.participant1Id === currentUserId ? conv.participant2Name : conv.participant1Name;
        const isSelected = selectedConversation && selectedConversation.conversationId === conv.conversationId;
        const unreadCount = unreadCounts[conv.conversationId] || 0;
        const isUnread = unreadCount > 0;
        return (
          <div
            key={conv.conversationId}
            style={{
              padding: '12px 16px',
              background: isSelected ? '#e8f5f3' : '#ffffff',
              cursor: 'pointer',
              borderBottom: '1px solid #f0f0f0',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center'
            }}
            onClick={() => onSelectConversation(conv)}
            onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
            onMouseLeave={(e) => e.target.style.background = isSelected ? '#e8f5f3' : '#ffffff'}
          >
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: '#2ECCB6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '20px',
              marginRight: '12px',
              position: 'relative'
            }}>
              <i className="fas fa-user"></i>
              {isUnread && (
                <div style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#ff0000',
                  color: '#fff',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: isUnread ? 'bold' : '600', color: '#333', fontSize: '16px' }}>
                {otherName || `User ${otherId}`}
              </div>
              <div style={{ fontSize: '14px', color: isUnread ? '#000' : '#666', marginTop: '2px', fontWeight: isUnread ? 'bold' : 'normal' }}>
                {conv.lastMessageAt ? `Tin nhắn cuối: ${new Date(new Date(conv.lastMessageAt).getTime() - 7 * 60 * 60 * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}` : 'Chưa có tin nhắn'}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#999', textAlign: 'right' }}>
              {conv.lastMessageAt ? new Date(new Date(conv.lastMessageAt).getTime() - 7 * 60 * 60 * 1000).toLocaleDateString('vi-VN') : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChatList;
