import { AppBar, Box, Divider, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import React, { useEffect } from 'react';
import AddAccountDialog from './AddAccountDialog'
import { Add } from '@mui/icons-material';
import { createRoot } from 'react-dom/client';

const drawerWidth = 240;

function App() {

  const [openAddAccount, setOpenAddAccount] = React.useState(false);
  const [openDrawer, setOpenDrawer] = React.useState(false);

  const [accountData, setAccountData] = React.useState([]);

  const [mailHeaderList, setMailHeaderList] = React.useState([]);
  const [mailBody, SetMailBody] = React.useState("");
  // 메일 계정 데이터 확인 후 없으면 계정 등록 Dialog 호출
  // 메일 계정 데이터가 있으면 각 계정당 메일 목록 가져오기
  useEffect(() => {
    const {ipcRenderer} = window.require("electron");
    ipcRenderer.send("createAccountDatabase");
    ipcRenderer.send("lookupAccountDatabase");
    ipcRenderer.once('lookupAccountDatabaseReply', (eve:any, res:any) => {
    if (res.length === 0) {
      setOpenAddAccount(true);
      ipcRenderer.removeAllListeners('lookupAccountDatabaseReply');
    }
    else {
      setAccountData(res);
      ipcRenderer.send("getMailList", res[0]);
      ipcRenderer.once('getMailListReply', (eve:any, res:any) => {
        console.log("show start");
        var a: any = []
        console.log(res);
        res.forEach((element: any) => {
          console.log(element);
          let headerJson = element;
          console.log(headerJson);
          a.push(headerJson);
        });
        a.reverse();
        setMailHeaderList(a);
        ipcRenderer.removeAllListeners('getMailListReply');
      })
    }
  });
  }, []);

  const handleCloseAddAccount = () => {
    setOpenAddAccount(false);
  };

  const handleDrawerToggle = () => {
    setOpenDrawer(!openDrawer);
  }

  const handleDrawerClose = () => {
    setOpenDrawer(false);
  }

  const handleDrawerTransitionEnd = () => {
    if (!openDrawer) {
      setOpenDrawer(false);
    }
  }

  const handleMailBody = (index: number) => {
    const bodyElement = document.getElementById('mailBody');
    if (bodyElement) {
      let bodyDOM = createRoot(bodyElement);
      
      let body = <div dangerouslySetInnerHTML={{__html: mailHeaderList[index]["body"]}}></div>;
      bodyDOM.render(body);
    } else {
      console.error("Element with id 'mailBody' not found.");
    }
  }

  const mailListDrawer = (
    <div style={{textOverflow:"ellipse", WebkitLineClamp: "2", WebkitBoxOrient: "vertical", wordBreak: "break-all"}}>
      <Toolbar/>
      <Divider/>
      <List>
        {mailHeaderList.map((data: any, index: number) => (
          <ListItem onClick={() => handleMailBody(index)}>
            <ListItemButton>
              <ListItemText primary={data.from} secondary={data.subject}/>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  )

  // 계정 정보 Drawer
  const drawer = (
    <div>
      <Toolbar/>
      <Divider/>
      <List>
        {accountData.map((account: any, index) => (
          <ListItem key={account.id} disablePadding>
            <ListItemButton>
              <ListItemText primary={account.description} secondary={account.mailEmail}/>
            </ListItemButton>
          </ListItem>
        ))}
        <Divider/>
        <ListItem>
          <ListItemButton onClick={() => setOpenAddAccount(true)}>
            <ListItemIcon>
              <Add/>
            </ListItemIcon>
            <ListItemText primary="Add Account"/>
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  )

  return (
    <>
    <Box sx={{display: 'flex'}}>
      <AppBar sx={{zIndex:(theme) => theme.zIndex.drawer + 1}}>
        <Toolbar>
        <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">Aimail</Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        id="mailListDrawer"
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        {mailListDrawer}
      </Drawer>
      <Box>
        <Toolbar/>
        <div id="mailBody"></div>
      </Box>
    </Box>
    <AddAccountDialog open={openAddAccount} onClose={handleCloseAddAccount}/>
    <Box
      component="nav"
      sx={{ width: {sm: drawerWidth}, flexShrink: {sm: 0}}}
      aria-label="mail accounts"
    >
      <Drawer
        id='mailAccountDrawer'
        open={openDrawer}
        onTransitionEnd={handleDrawerTransitionEnd}
        onClose={handleDrawerClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{

          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>
    </Box>
    </>
  );
}

export default App;
