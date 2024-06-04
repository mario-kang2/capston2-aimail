import { Add, Remove, Send } from "@mui/icons-material";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import AddContactsDialog from "./AddContactsDialog";

export interface ContactsDialogProps {
    open: boolean;
    onClose: () => void;
}


export default function ContactsDialog(props: ContactsDialogProps) {
    const {open, onClose} = props;
    const [removeOpen, setRemoveOpen] = useState(false);

    const {ipcRenderer} = window.require("electron");
    const [ContactsData, setContactsData] = useState([]);
    const [openAddContacts, setOpenAddContacts] = useState(false);
    const [openManageSendContacts, setOpenManageSendContacts] = useState(false);
    const [ContactsName, setContactsName] = useState("");

    useEffect(() => {
        const {ipcRenderer} = window.require("electron");
        ipcRenderer.send("lookupContactsDatabase");
        ipcRenderer.once('lookupContactsDatabaseReply', (eve:any, res:any) => {
            setContactsData(res);
        });
    }, []);
    const handleClose = () => {
        onClose();
    }
    const handleOpenRemoveContacts = (index:number, ContactsName:string) => {
        setContactsName(ContactsName)
        setRemoveOpen(true)
    }
    const handleCloseAddContacts = () => {
        setOpenAddContacts(false);
        ipcRenderer.send("lookupContactsDatabase");
        ipcRenderer.once('lookupContactsDatabaseReply', (eve:any, res:any) => {
            setContactsData(res);
        });
    };

    return (
        <>
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Contacts</DialogTitle>
            <DialogContent>
                <List>
                    {ContactsData.map((Contacts: any, index) => (
                        <Stack direction="row">
                            <ListItem key={Contacts.contact_id}>
                                <ListItemButton onClick={() => { handleOpenRemoveContacts(index, Contacts.name)}}>
                                    <ListItemIcon>
                                        <Remove/>
                                    </ListItemIcon>
                                    <ListItemText primary={Contacts.name} secondary={Contacts.address}/>
                                </ListItemButton>
                            </ListItem>
                        </Stack>
                    ))}
                </List>
                <Divider/>
                <ListItem>
                    <ListItemButton onClick={() => setOpenAddContacts(true)}>
                        <ListItemIcon>
                            <Add/>
                        </ListItemIcon>
                        <ListItemText primary="Add Contacts"/>
                    </ListItemButton>
                </ListItem>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
    <AddContactsDialog open={openAddContacts} onClose={handleCloseAddContacts}/>
    </>
    )
}