import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle} from "@mui/material";

export interface RemoveAccountProps {
    open: boolean;
    onClose: () => void;
    accountName: string;
}

export default function RemoveAccountDialog(props: RemoveAccountProps) {
    const {open, onClose, accountName} = props; 
    const {ipcRenderer} = window.require("electron");

    const handleClose = () => {
        onClose();
    }

    const handleRemoveAccount = () => {
        ipcRenderer.send("removeAccount", {
            description: accountName
        });
        onClose();
    };

    return (
        <Dialog open={open}>
            <DialogTitle>Remove {accountName}?</DialogTitle>
            <DialogContent>
                <DialogContentText>This action cannot be undone.</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button color="error" onClick={handleRemoveAccount}>Remove</Button>
            </DialogActions>
        </Dialog>
    )
}