import { AppBar, Box, Container, Divider, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Snackbar, Stack, Toolbar, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import React, { useEffect } from 'react';

import { Add, Delete, Mail, ManageAccounts, Send } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close'
import { createRoot } from 'react-dom/client';

import AddAccountDialog from './AddAccountDialog'
import AccountManageDialog from './AccountManageDialog';
import AddSendAccountDialog from './AddSendAccountDialog';

const drawerWidth = 240;

function App() {

  const [openAddAccount, setOpenAddAccount] = React.useState(false);
  const [openAddSendAccount, setOpenAddSendAccount] = React.useState(false);
  const [openAccountManage, setOpenAccountManage] = React.useState(false);
  const [openDrawer, setOpenDrawer] = React.useState(false);

  const [accountData, setAccountData] = React.useState([]);
  const [sendAccountData, setSendAccountData] = React.useState([]);
  const [mailHeaderList, setMailHeaderList] = React.useState([]);

  const [mailBodyFrom, SetMailBodyFrom] = React.useState("");
  const [mailBodyTitle, SetMailBodyTitle] = React.useState("");
  const [mailBodyTimes, SetMailBodyTimes] = React.useState("");

  const [selectedIndex, SetSelectedIndex] = React.useState(0);

  const {ipcRenderer} = window.require("electron");

  const [mailLoadedSnackbarOpen, setMailLoadedSnackbarOpen] = React.useState(false);

  // 앱 실행 시 동작
  // 메일 계정 데이터 확인 후 없으면 계정 등록 Dialog 호출
  // 메일 계정 데이터가 있으면 각 계정당 메일 목록 가져오기
  // 보내기 계정 데이터 확인
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
      SetSelectedIndex(0);
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
        setMailLoadedSnackbarOpen(true);
      })
    }

    ipcRenderer.send("lookupSendAccountDatabase");
    ipcRenderer.once('lookupSendAccountDatabaseReply', (eve:any, res:any) => {
      setSendAccountData(res);
    });
  });
  }, []);

  const handleCloseAddAccount = () => {
    setOpenAddAccount(false);
    ipcRenderer.send("lookupAccountDatabase");
        ipcRenderer.once('lookupAccountDatabaseReply', (eve:any, res:any) => {
          setAccountData(res);
      });
  };

  const handleCloseAddSendAccount = () => {
    setOpenAddSendAccount(false);
    ipcRenderer.send("lookupSendAccountDatabase");
        ipcRenderer.once('lookupSendAccountDatabaseReply', (eve:any, res:any) => {
          setSendAccountData(res);
      });
  };

  const handleCloseAccountManage = () => {
    setOpenAccountManage(false);
    ipcRenderer.send("lookupAccountDatabase");
        ipcRenderer.once('lookupAccountDatabaseReply', (eve:any, res:any) => {
          setAccountData(res);
      });
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

  // 계정 목록에서 계정 선택 시 동작
  const handleMailList = (index: number) => {
    SetSelectedIndex(index);
    ipcRenderer.send("getMailList", accountData[index]);
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
    const bodyElement = document.getElementById('mailBody');
    if (bodyElement) {
      let bodyDOM = createRoot(bodyElement);
      let body = <div></div>
      bodyDOM.render(body)
    }
    SetMailBodyFrom("")
    SetMailBodyTitle("")
    SetMailBodyTimes("")
    handleDrawerClose()
  }

  // 메일 본문 렌더링
  const handleMailBody = (index: number) => {
    const bodyElement = document.getElementById('mailBody');
    if (bodyElement) {
      let bodyDOM = createRoot(bodyElement);
      let mailText = mailHeaderList[index]["body"][0] as string;
      if (mailText.startsWith("PLAIN\r\n\r\n")) { // Plain Text Mail
        mailText = mailText.replace("PLAIN\r\n\r\n", "");
        let regex = /\n/gi;
        mailText = mailText.replace(regex, " <br>")
        let urlRegex = /(https?:\/\/[^ ]*)/gi;
        mailText = mailText.replace(urlRegex, "<a href=\"$&\">$&</a>")
      }
      else { // HTML Mail
        mailText = mailText.replace("HTML\r\n\r\n", "");
      }

      let body = <div style={{wordBreak: 'break-all'}} dangerouslySetInnerHTML={{__html: mailText}}></div>;
      bodyDOM.render(body);

      // From
      let from = mailHeaderList[index]["from"][0] as string;
      let fromRegex = /"([^]*)" <([^ ]*)>/i
      if (fromRegex.test(from)) {
        from = from.replace(fromRegex, "$1");
      }
      SetMailBodyFrom(from)
      SetMailBodyTitle(mailHeaderList[index]["subject"])

      // Times
      let isoTimeString = mailHeaderList[index]["times"];
      let date = new Date(isoTimeString);
      let formattedDate = date.toLocaleDateString() + " " + date.toLocaleTimeString();
      SetMailBodyTimes(formattedDate)
    } else {
      console.error("Element with id 'mailBody' not found.");
    }
    
  }

  // 메일 가져오기 버튼 선택 시 동작
  const handleGetMessageButton = () => {
    let index = selectedIndex;
    ipcRenderer.send("getMailList", accountData[index]);
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
      setMailLoadedSnackbarOpen(true);
    })
  }

  // 메일 가져왔음 Snackbar 닫기 동작
  const handleMailLoadedSnackbarClosed = () => {
    setMailLoadedSnackbarOpen(false);
  }
  
  // 메일 가져왔음 Snackbar 버튼 목록
  const mailLoadedSnackbarAction = (
    <React.Fragment>
      <IconButton
      size='small'
      aria-label="close"
      color="inherit"
      onClick={handleMailLoadedSnackbarClosed}
      >
        <CloseIcon fontSize='small'/>
      </IconButton>
    </React.Fragment>
  )

  // 메일 보내기 버튼 선택 동작
  // 보내는 메일 계정이 없으면 계정 추가 Dialog 호출
  const handleSendMailButton = () => {
    if (sendAccountData.length === 0) {
      setOpenAddSendAccount(true);
    }
    else {

    }
  }

  // 메일 목록 Drawer
  const mailListDrawer = (
    <div style={{textOverflow:"ellipse", WebkitLineClamp: "2", WebkitBoxOrient: "vertical", wordBreak: "break-all"}}>
      <Toolbar/>
      <Divider/>
      <List>
        {mailHeaderList.map((data: any, index: number) => (
          <ListItem onClick={() => handleMailBody(index)}>
            <ListItemButton>
              <ListItemText primary={data.from[0].replace(/"([^]*)" <([^ ]*)>/i, "$1")} secondary={data.subject} primaryTypographyProps={{noWrap: true}} secondaryTypographyProps={{noWrap: true}}/>
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
            <ListItemButton onClick={() => handleMailList(index)}>
              <ListItemText primary={account.description} secondary={account.mailEmail}/>
            </ListItemButton>
          </ListItem>
        ))}
        <Divider/>
        <ListItem>
          <ListItemButton onClick={() => setOpenAccountManage(true)}>
            <ListItemIcon>
              <ManageAccounts/>
            </ListItemIcon>
            <ListItemText primary="Manage Account"/>
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
          <Typography variant="h6" noWrap component="div" sx={{flexGrow: 1}}>Aimail</Typography>
          <IconButton
            color="inherit"
            aria-label="get new message" onClick={handleGetMessageButton}>
            <Mail/>
          </IconButton>
          <IconButton
            color="inherit"
            aria-label="send message" onClick={handleSendMailButton}>
            <Send/>
          </IconButton>
          <IconButton
            color="inherit"
            aria-label="delete message">
            <Delete/>
          </IconButton>
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
      <Container fixed>
      <Box sx={{p:2}}>
        <Toolbar/>
        <Box sx={{p:2}}>
          <Stack direction="row">
            <Typography gutterBottom variant="subtitle1" noWrap sx={{flexGrow: 1}}>{mailBodyFrom}</Typography>
            <Typography gutterBottom variant="subtitle2" noWrap>{mailBodyTimes}</Typography>
          </Stack>
          <Typography gutterBottom variant="subtitle2" noWrap>{mailBodyTitle}</Typography>
        </Box>
        <Divider/>
        <Box sx={{p:2}}>
        <div id="mailBody"></div>
        </Box>
      </Box>
      </Container>
    </Box>
    <AddAccountDialog open={openAddAccount} onClose={handleCloseAddAccount}/>
    <AddSendAccountDialog open={openAddSendAccount} onClose={handleCloseAddSendAccount}/>
    <AccountManageDialog open={openAccountManage} onClose={handleCloseAccountManage}/>
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
    <Snackbar
      open={mailLoadedSnackbarOpen}
      autoHideDuration={3000}
      message="Mail Loaded"
      onClose={handleMailLoadedSnackbarClosed}
      action={mailLoadedSnackbarAction}
      />
    </>
  );
}

export default App;
