import { AppBar, Box, Container, Divider, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Snackbar, Stack, Toolbar, Tooltip, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import React, { useEffect } from 'react';

import { Add, Delete, Mail, ManageAccounts, Send } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close'
import { createRoot } from 'react-dom/client';

import AddAccountDialog from './AddAccountDialog'
import AccountManageDialog from './AccountManageDialog';
import AddSendAccountDialog from './AddSendAccountDialog';
import SendMailDialog from './SendMailDialog';

const drawerWidth = 240;

function App() {

  const [openAddAccount, setOpenAddAccount] = React.useState(false);
  const [openAddSendAccount, setOpenAddSendAccount] = React.useState(false);
  const [openAccountManage, setOpenAccountManage] = React.useState(false);
  const [openDrawer, setOpenDrawer] = React.useState(false);
  const [openSendMail, setOpenSendMail] = React.useState(false);
  const [accountData, setAccountData] = React.useState([]);
  const [sendAccountData, setSendAccountData] = React.useState([]);
  const [mailHeaderList, setMailHeaderList] = React.useState([]);

  const [mailBodyFrom, SetMailBodyFrom] = React.useState("");
  const [mailBodyTitle, SetMailBodyTitle] = React.useState("");
  const [mailBodyTimes, SetMailBodyTimes] = React.useState("");

  const [selectedIndex, SetSelectedIndex] = React.useState(0);
  const [selectedMailIndex, SetSelectedMailIndex] = React.useState(-1);

  const {ipcRenderer} = window.require("electron");

  const [mailLoadedSnackbarOpen, setMailLoadedSnackbarOpen] = React.useState(false);
  const [mailSentSnackbarOpen, setMailSentSnackbarOpen] = React.useState(false);
  const [mailDeletedSnackbarOpen, setMailDeletedSnackbarOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [searchBy, setSearchBy] = React.useState('subject');

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
        var a: any = []
        console.log(res);
        res.forEach((element: any) => {
          let headerJson = element;
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
      ipcRenderer.removeAllListeners('lookupSendAccountDatabaseReply');
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

  const handleCloseSendMail = (sent:boolean) => {
    setOpenSendMail(false);
    if (sent) {
      setMailSentSnackbarOpen(true);
    }
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
      var a: any = []
      res.forEach((element: any) => {
        let headerJson = element;
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
    SetSelectedMailIndex(-1)
    handleDrawerClose()
  }

  // 메일 본문 렌더링
  const handleMailBody = (index: number) => {
    SetSelectedMailIndex(index);
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
      let formattedDate = date.toLocaleString();
      SetMailBodyTimes(formattedDate)
    }
    
  }

  // 메일 가져오기 버튼 선택 시 동작
  const handleGetMessageButton = () => {
    let index = selectedIndex;
    ipcRenderer.send("getMailList", accountData[index]);
    ipcRenderer.once('getMailListReply', (eve:any, res:any) => {
      console.log("show start");
      var a: any = []
      res.forEach((element: any) => {
        let headerJson = element;
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

  // 메일 보냈음 Snackbar 닫기 동작
  const handleMailSentSnackbarClosed = () => {
    setMailSentSnackbarOpen(false);
  }

  // 메일 보냈음 Snackbar 버튼 목록
  const mailSentSnackbarAction = (
    <React.Fragment>
      <IconButton
      size='small'
      aria-label="close"
      color="inherit"
      onClick={handleMailSentSnackbarClosed}
      >
        <CloseIcon fontSize='small'/>
      </IconButton>
    </React.Fragment>
  )

  // 메일 삭제했음 Snackbar 닫기 동작
  const handleMailDeletedSnackbarClosed = () => {
    setMailDeletedSnackbarOpen(false);
  }

  // 메일 삭제했음 Snackbar 버튼 목록
  const mailDeletedSnackbarAction = (
    <React.Fragment>
      <IconButton
      size='small'
      aria-label="close"
      color="inherit"
      onClick={handleMailDeletedSnackbarClosed}
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

  // 메일 삭제 버튼 선택 동작
  const handleDeleteMailButton = () => {
    let accountIndex = selectedIndex;
    let mailIndex = selectedMailIndex;
    if (mailIndex === -1) {
      return;
    }
    console.log(mailHeaderList[mailIndex]);
    ipcRenderer.send("deleteMail", {"auth":accountData[accountIndex], "index":mailHeaderList[mailIndex]["uid"]});
    ipcRenderer.once('deleteMailReply', (eve:any, res:any) => {
      if (res) {
        ipcRenderer.send("getMailList", accountData[accountIndex]);
        ipcRenderer.once('getMailListReply', (eve:any, res:any) => {
          var a: any = []
          res.forEach((element: any) => {
            let headerJson = element;
            a.push(headerJson);
          });
          a.reverse();
          setMailHeaderList(a);
          ipcRenderer.removeAllListeners('getMailListReply');
          const bodyElement = document.getElementById('mailBody');
          if (bodyElement) {
            let bodyDOM = createRoot(bodyElement);
            let body = <div></div>
            bodyDOM.render(body)
          }
          SetMailBodyFrom("")
          SetMailBodyTitle("")
          SetMailBodyTimes("")
          SetSelectedMailIndex(-1)
          setMailDeletedSnackbarOpen(true);
        })
      }
      ipcRenderer.removeAllListeners('deleteMailReply');
    })
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
  const handleQueryChange = (event:any) => {
    setQuery(event.target.value);
  };

  const handleSearchByChange = (event:any) => {
    setSearchBy(event.target.value);
  };
  const handleSearch = () => {
    console.log(query);
    ipcRenderer.send("searchMail",searchBy,query);
    ipcRenderer.once('searchMailReply', (eve:any, res:any) => {
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
          <div>
            <select value={searchBy} onChange={handleSearchByChange}>
              <option value="subject">제목</option>
              <option value="sender">발신인</option>
            </select>
          </div>
          <div>
            <input
                type="text"
                value={query}
                onChange={handleQueryChange}
            />
            <button onClick={handleSearch}>검색</button>
          </div>
          <Tooltip title="Get New Message">
            <IconButton
              color="inherit"
              aria-label="get new message" onClick={handleGetMessageButton}>
              <Mail/>
            </IconButton>
          </Tooltip>
          <Tooltip title="Get New Message">
            <IconButton
              color="inherit"
              aria-label="send message" onClick={handleSendMailButton}>
              <Send/>
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Message">
            <IconButton
              color="inherit"
              aria-label="delete message" onClick={handleDeleteMailButton}>
              <Delete/>
            </IconButton>
          </Tooltip>
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
    <SendMailDialog open={openSendMail} onClose={handleCloseSendMail}/>
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
    <Snackbar
      open={mailSentSnackbarOpen}
      autoHideDuration={3000}
      message="Mail Sent"
      onClose={handleMailSentSnackbarClosed}
      action={mailSentSnackbarAction}
      />
    <Snackbar
      open={mailDeletedSnackbarOpen}
      autoHideDuration={3000}
      message="Mail Deleted"
      onClose={handleMailDeletedSnackbarClosed}
      action={mailDeletedSnackbarAction}
      />
    </>
  );
}

export default App;
