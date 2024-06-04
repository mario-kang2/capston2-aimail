import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from "@mui/material";
import { useState } from "react";

export interface AddContactsDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function AddContactsDialog(props: AddContactsDialogProps) {
    const {open, onClose} = props;
    const {ipcRenderer} = window.require("electron");

    const [name, setname] = useState("");
    const [address, setaddress] = useState("");
    const [phoneNumber, setphoneNumber] = useState("");


    const [discriptionError, setnameError] = useState(false);
    const [addressError, setaddressError] = useState(false);


    var addressErrorText = "";

    const handleDiscriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setname(e.target.value);
        if (e.target.value.length === 0) {
            setnameError(true);
        } else {
            setnameError(false);
        }
    }

    const handleaddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setaddress(e.target.value)
        if (e.target.value.length === 0) {
            setaddressError(true);
        } else {
            setaddressError(false);
        }
    }


    const handleClose = () => {
        onClose();
    }

    const AddContacts = () => {
        if (name.length === 0) {
            setnameError(true);
            return;
        }
        if (address.length === 0) {
            setaddressError(true);
            return;
        }
        ipcRenderer.send("addContacts", {
            name: name,
            address: address,
            phoneNumber: phoneNumber
        });
        handleClose();
    }

    return (
        <Dialog open={open}>
            <DialogTitle>Add Contacts</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    required
                    fullWidth
                    variant="standard"
                    label="name"
                    value={name}
                    error={discriptionError}
                    helperText={discriptionError ? "name is required" : ""}
                    onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleDiscriptionChange(e)}
                />
                <TextField
                    required
                    fullWidth
                    variant="standard"
                    label="address"
                    value={address}
                    error={addressError}
                    helperText={addressError ? "address is required" : ""}
                    onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleaddressChange(e)}
                />
                <TextField
                    fullWidth
                    variant="standard"
                    label="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setphoneNumber(e.target.value)}
                />
                <DialogContentText id="addressErrorname">{addressErrorText}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={AddContacts}>Add Contacts</Button>
            </DialogActions>
        </Dialog>
    )
}