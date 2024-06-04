import { Add, Remove, Send } from "@mui/icons-material";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Stack } from "@mui/material";
import { useEffect, useState } from "react";

import AddAccountDialog from "./AddAccountDialog";
import RemoveAccountDialog from "./RemoveAccountDialog";
import SendAccountManageDialog from "./SendAccountManageDialog";

export interface AccountManageDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function AccountManageDialog(props: AccountManageDialogProps) {
    const {open, onClose} = props; 

    const [removeOpen, setRemoveOpen] = useState(false);

    const {ipcRenderer} = window.require("electron");
    const [accountData, setAccountData] = useState([]);
    const [openAddAccount, setOpenAddAccount] = useState(false);
    const [openManageSendAccount, setOpenManageSendAccount] = useState(false);

    const [accountName, setAccountName] = useState("");

    useEffect(() => {
        const {ipcRenderer} = window.require("electron");
        ipcRenderer.send("lookupAccountDatabase");
        ipcRenderer.once('lookupAccountDatabaseReply', (eve:any, res:any) => {
          setAccountData(res);
      });
      }, []);

    const handleClose = () => {
        onClose();
    }

    const handleCloseAddAccount = () => {
        setOpenAddAccount(false);
        ipcRenderer.send("lookupAccountDatabase");
        ipcRenderer.once('lookupAccountDatabaseReply', (eve:any, res:any) => {
          setAccountData(res);
      });
    };

    const handleCloseRemoveAccount = () => {
        setRemoveOpen(false)
        ipcRenderer.send("lookupAccountDatabase");
        ipcRenderer.once('lookupAccountDatabaseReply', (eve:any, res:any) => {
          setAccountData(res);
      });
    };

    const handleOpenRemoveAccount = (index:number, accountName:string) => {
        setAccountName(accountName)
        setRemoveOpen(true)
    }

    const handleColoseAddSendAccount = () => {
        setOpenManageSendAccount(false);
    }

    return (
        <>
        <Dialog open={open}>
            <DialogTitle>Manage Account</DialogTitle>
            <DialogContent>
                <List>
                    {accountData.map((account: any, index) => (
                        <Stack direction="row">
                            <ListItem key={account.id}>
                                <ListItemButton onClick={() => { handleOpenRemoveAccount(index, account.description)}}>
                                    <ListItemIcon>
                                        <Remove/>
                                    </ListItemIcon>
                                    <ListItemText primary={account.description} secondary={account.mailEmail}/>
                                </ListItemButton>
                            </ListItem>
                        </Stack>
                    ))}
                </List>
                <Divider/>
                <ListItem>
                    <ListItemButton onClick={() => setOpenAddAccount(true)}>
                        <ListItemIcon>
                        <Add/>
                        </ListItemIcon>
                        <ListItemText primary="Add Account"/>
                    </ListItemButton>
                </ListItem>
                <ListItem>
                    <ListItemButton onClick={() => setOpenManageSendAccount(true)}>
                        <ListItemIcon>
                            <Send/>
                        </ListItemIcon>
                        <ListItemText primary="Manage Send Accounts"/>
                    </ListItemButton>
                </ListItem>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
        <AddAccountDialog open={openAddAccount} onClose={handleCloseAddAccount}/>
        <RemoveAccountDialog open={removeOpen} onClose={handleCloseRemoveAccount} accountName={accountName}/>
        <SendAccountManageDialog open={openManageSendAccount} onClose={handleColoseAddSendAccount}/>
        </>
    )
}