import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";

export interface ContactsDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function AddAccountDialog(props: ContactsDialogProps) { 
    const {open, onClose} = props;
    const {ipcRenderer} = window.require("electron");

    const handleClose = () => {
        onClose();
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Contacts</DialogTitle>
            <DialogContent>

            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}