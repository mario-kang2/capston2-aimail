import { AppBar, Box, Container, Divider, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Stack, Toolbar, Typography } from '@mui/material';
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

  const [mailBodyFrom, SetMailBodyFrom] = React.useState("");
  const [mailBodyTitle, SetMailBodyTitle] = React.useState("");
  const [mailBodyTimes, SetMailBodyTimes] = React.useState("");
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
      let fromRegex = /\"([^]*)\" <([^ ]*)>/i
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

  const mailListDrawer = (
    <div style={{textOverflow:"ellipse", WebkitLineClamp: "2", WebkitBoxOrient: "vertical", wordBreak: "break-all"}}>
      <Toolbar/>
      <Divider/>
      <List>
        {mailHeaderList.map((data: any, index: number) => (
          <ListItem onClick={() => handleMailBody(index)}>
            <ListItemButton>
              <ListItemText primary={data.from[0].replace(/\"([^]*)\" <([^ ]*)>/i, "$1")} secondary={data.subject} primaryTypographyProps={{noWrap: true}} secondaryTypographyProps={{noWrap: true}}/>
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
