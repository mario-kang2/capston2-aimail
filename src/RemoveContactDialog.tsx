import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle} from "@mui/material";

export interface RemoveContactProps {
    open: boolean;
    onClose: () => void;
    contactAddress: string;
    contactName: string;
}

export default function RemoveContactDialog(props: RemoveContactProps) {
    const {open, onClose, contactAddress, contactName} = props;
    const {ipcRenderer} = window.require("electron");

    const handleClose = () => {
        onClose();
    }

    const handleRemoveContact = () => {
        ipcRenderer.send("removeContact", {
            address: contactAddress
        });
        onClose();
    };

    return (
        <Dialog open={open}>
            <DialogTitle>Remove {contactName}?</DialogTitle>
            <DialogContent>
                <DialogContentText>This action cannot be undone.</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button color="error" onClick={handleRemoveContact}>Remove</Button>
            </DialogActions>
        </Dialog>
    )
}