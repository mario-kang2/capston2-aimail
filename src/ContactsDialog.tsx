import { Add, Remove } from "@mui/icons-material";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { useEffect, useState } from "react";
import AddContactDialog from "./AddContactDialog";
import RemoveContactDialog from "./RemoveContactDialog";

export interface ContactsDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function AddAccountDialog(props: ContactsDialogProps) {
    const {open, onClose} = props;
    const [contact, setContact] = useState([]);
    const [openAddContact, setOpenAddContact] = useState(false);
    const [openRemoveContact, setOpenRemoveContact] = useState(false);

    const [name, setName] = useState("");
    const [address, setAddress] = useState("");

    const {ipcRenderer} = window.require("electron");

    useEffect(() => {
        const {ipcRenderer} = window.require("electron");
        ipcRenderer.send("lookupContactDatabase");
        ipcRenderer.once('lookupContactDatabaseReply', (eve:any, res:any) => {
            console.log(res);
            setContact(res);
        });
    }, []);

    const handleClose = () => {
        onClose();
    }

    const handleCloseAddContact = () => {
        setOpenAddContact(false);
        ipcRenderer.send("lookupContactDatabase");
        ipcRenderer.once('lookupContactDatabaseReply', (eve:any, res:any) => {
            setContact(res);
        });
    }

    const handleOpenRemoveContact = (index: number, contactAddress: string, contactName: string) => {
        setName(contactName);
        setAddress(contactAddress);
        setOpenRemoveContact(true);
    }

    const handleCloseRemoveContact = () => {
        setOpenRemoveContact(false);
        ipcRenderer.send("lookupContactDatabase");
        ipcRenderer.once('lookupContactDatabaseReply', (eve:any, res:any) => {
            setContact(res);
        });
    }

    return (
        <>
            <Dialog open={open} onClose={onClose}>
                <DialogTitle>Contacts</DialogTitle>
                <DialogContent>
                    <List>
                        {contact.map((value:any, index:number) => (
                            <ListItem key={value.contact_id}>
                                <ListItemButton onClick={() => handleOpenRemoveContact(index, value.address, value.name)}>
                                    <ListItemIcon>
                                        <Remove/>
                                    </ListItemIcon>
                                    <ListItemText primary={value.name} secondary={value.address}/>
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                    <Divider/>
                    <ListItem>
                        <ListItemButton onClick={() => setOpenAddContact(true)}>
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
            <AddContactDialog open={openAddContact} onClose={handleCloseAddContact}/>
            <RemoveContactDialog open={openRemoveContact} onClose={handleCloseRemoveContact} contactAddress={address} contactName={name}/>
        </>
    )
}