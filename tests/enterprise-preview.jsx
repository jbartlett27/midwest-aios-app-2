import React from 'react';
import { createRoot } from 'react-dom/client';
import EnterpriseNetwork from '../src/enterprise/EnterpriseNetwork.jsx';

function Preview() {
  const [member, setMember] = React.useState({ id: 'fixture-maureen', name: 'Demo member' });
  return <main style={{ maxWidth: 1440, margin: '0 auto', height: '100dvh' }}>
    <div style={{ padding: '10px 20px', background: '#171717', color: '#aaa', font: '12px sans-serif' }}>Gated integration fixture. Synthetic identity. Shared DYFRENT component receiver and live conversation proof pending.<button style={{ marginLeft: 12 }} onClick={() => setMember({ id: 'fixture-dave', name: 'Second demo member' })}>Switch fixture identity</button></div>
    <EnterpriseNetwork key={member.id} currentUser={member} getToken={async () => 'synthetic-preview-session'} screenLabel="Vendor Bills" />
  </main>;
}
createRoot(document.getElementById('root')).render(<Preview />);
