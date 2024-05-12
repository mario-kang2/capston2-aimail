import { Add, Remove } from "@mui/icons-material";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, FormControl, InputLabel, List, ListItem, ListItemButton, ListItemIcon, ListItemText, MenuItem, Select, SelectChangeEvent, Stack, TextField } from "@mui/material";
import { useEffect, useState } from "react";

import AddAccountDialog from "./AddAccountDialog";
import RemoveAccountDialog from "./RemoveAccountDialog";

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

    const [index, setIndex] = useState(0);
    const [accountName, setAccountName] = useState("");

    useEffect(() => {
        console.log("aa!");
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
        setIndex(index)
        setAccountName(accountName)
        setRemoveOpen(true)
    }

    return (
        <>
        <Dialog open={open}>
            <DialogTitle>Manage Account</DialogTitle>
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
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
        <AddAccountDialog open={openAddAccount} onClose={handleCloseAddAccount}/>
        <RemoveAccountDialog open={removeOpen} onClose={handleCloseRemoveAccount} index={index} accountName={accountName}/>
        </>
    )
}