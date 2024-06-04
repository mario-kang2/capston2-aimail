import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useState } from "react";

export interface AddContactDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function AddContactDialog(props: AddContactDialogProps) {
    const {open, onClose} = props;

    const [name, setName] = useState("");
    const [address, setAddress] = useState("");

    const [nameError, setNameError] = useState(false);
    const [addressError, setAddressError] = useState(false);

    const {ipcRenderer} = window.require("electron");

    const handleNameChange = (e:React.ChangeEvent<HTMLInputElement>) => {
        setName(e.target.value);
        if (e.target.value.length === 0) {
            setNameError(true);
        } else {
            setNameError(false);
        }
    }

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddress(e.target.value);
        if (e.target.validity.valid) {
            setAddressError(false);
        } else {
            setAddressError(true);
        }
    }

    const handleClose = () => {
        onClose();
    }

    const handleAddContact = () => {
        if (name.length === 0) {
            setNameError(true);
            return;
        }
        if (address.length === 0) {
            setAddressError(true);
            return;
        }
        ipcRenderer.send("addContact", {name: name, address: address});
        handleClose();
    }

    return (
        <Dialog open={open}>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    required
                    fullWidth
                    variant="standard"
                    label="Name"
                    value={name}
                    error={nameError}
                    helperText={nameError ? "Name is required" : ""}
                    onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleNameChange(e)}
                />
                <TextField
                    required
                    fullWidth
                    variant="standard"
                    label="Mail Address"
                    type="email"
                    value={address}
                    error={addressError}
                    helperText={addressError ? "Mail address is invalid" : ""}
                    onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleAddressChange(e)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={handleAddContact}>Add Contact</Button>
            </DialogActions>
        </Dialog>
    )
}