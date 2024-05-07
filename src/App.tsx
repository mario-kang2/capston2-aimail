import { AppBar, Toolbar, Typography } from '@mui/material';
import React, { useEffect } from 'react';
import AddAccountDialog from './AddAccountDialog'

function App() {

  const [openAddAccount, setOpenAddAccount] = React.useState(false);

  // 메일 계정 데이터 확인 후 없으면 계정 등록 Dialog 호출
  useEffect(() => {
    const {ipcRenderer} = window.require("electron");
    ipcRenderer.send("createAccountDatabase");
    ipcRenderer.send("lookupAccountDatabase");
    ipcRenderer.once('lookupAccountDatabaseReply', (eve:any, res:any) => {
    if (res.length === 0) {
      setOpenAddAccount(true);
      ipcRenderer.removeAllListeners('lookupAccountDatabaseReply');
    }
  });
  }, []);

  const handleCloseAddAccount = () => {
    setOpenAddAccount(false);
  };

  return (
    <>
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div">Aimail</Typography>
      </Toolbar>
    </AppBar>
    <AddAccountDialog open={openAddAccount} onClose={handleCloseAddAccount}/>
    </>
  );
}

export default App;
