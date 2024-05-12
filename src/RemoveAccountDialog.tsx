import { Add, Remove } from "@mui/icons-material";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, FormControl, InputLabel, List, ListItem, ListItemButton, ListItemIcon, ListItemText, MenuItem, Select, SelectChangeEvent, Stack, TextField } from "@mui/material";
import { useEffect, useState } from "react";

export interface RemoveAccountProps {
    open: boolean;
    onClose: () => void;
    index: number;
    accountName: string;
}

export default function RemoveAccountDialog(props: RemoveAccountProps) {
    const {open, onClose, index, accountName} = props; 
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