import { Add, Remove } from "@mui/icons-material";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Stack } from "@mui/material";
import { useEffect, useState } from "react";

import RemoveSendAccountDialog from "./RemoveSendAccountDialog";
import AddSendAccountDialog from "./AddSendAccountDialog";

export interface SendAccountManageDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function SendAccountManageDialog(props: SendAccountManageDialogProps) {
    const {open, onClose} = props; 
    const [accountData, setAccountData] = useState([]);

    const [accountName, setAccountName] = useState("");
    const [removeOpen, setRemoveOpen] = useState(false);
    const [openAddAccount, setOpenAddAccount] = useState(false);
    const {ipcRenderer} = window.require("electron");

    useEffect(() => {
        const {ipcRenderer} = window.require("electron");
        ipcRenderer.send("lookupSendAddressDatabase");
        ipcRenderer.once('lookupSendAccountDatabaseReply', (eve:any, res:any) => {
            setAccountData(res);
        });
    }, []);

    const handleClose = () => {
        onClose();
    }

    const handleOpenRemoveAccount = (index:number, accountName:string) => {
        setAccountName(accountName)
        setRemoveOpen(true)
    }

    const handleCloseAddAccount = () => {
        setOpenAddAccount(false);
        ipcRenderer.send("lookupSendAccountDatabase");
        ipcRenderer.once('lookupSendAccountDatabaseReply', (eve:any, res:any) => {
          setAccountData(res);
      });
    };

    const handleCloseRemoveAccount = () => {
        setRemoveOpen(false)
        ipcRenderer.send("lookupSendAccountDatabase");
        ipcRenderer.once('lookupSendAccountDatabaseReply', (eve:any, res:any) => {
          setAccountData(res);
      });
    };


    return (
        <>
            <Dialog open={open}>
                <DialogTitle>Manage Send Account</DialogTitle>
                <DialogContent>
                    <List>
                        {accountData.map((account: any, index) => (
                            <Stack direction="row">
                            <ListItem key={account.id}>
                                <ListItemButton onClick={() => handleOpenRemoveAccount(index, account.description)}>
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
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Close</Button>
                </DialogActions>
            </Dialog>
            <AddSendAccountDialog open={openAddAccount} onClose={handleCloseAddAccount}/>
            <RemoveSendAccountDialog open={removeOpen} onClose={handleCloseRemoveAccount} accountName={accountName}/>
        </>
    )
}