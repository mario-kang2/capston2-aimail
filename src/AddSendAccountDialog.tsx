import { Description } from "@mui/icons-material";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from "@mui/material";
import { useState } from "react";

export interface AddSendAccountDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function AddSendAccountDialog(props: AddSendAccountDialogProps) {
    const {open, onClose} = props;
    const {ipcRenderer} = window.require("electron");

    const [description, setDescription] = useState("");
    const [host, setHost] = useState("");
    const [port, setPort] = useState(587);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [mailAddress, setMailAddress] = useState("");
    const [security, setSecurity] = useState("STARTTLS");

    const [discriptionError, setDescriptionError] = useState(false);
    const [hostError, setHostError] = useState(false);
    const [portError, setPortError] = useState(false);
    const [mailAddressError, setMailAddressError] = useState(false);
    const [passwordError, setPasswordError] = useState(false);

    const handleClose = () => {
        onClose();
    }

    const handleDiscriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDescription(e.target.value);
        if (e.target.value.length === 0) {
            setDescriptionError(true);
        } else {
            setDescriptionError(false);
        }
    }

    const handleHostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setHost(e.target.value)
        if (e.target.value.length === 0) {
            setHostError(true);
        } else {
            setHostError(false);
        }
    }

    const handlePortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPort(parseInt(e.target.value));
        if (parseInt(e.target.value) < 1 || parseInt(e.target.value) > 65535) {
            setPortError(true);
        } else {
            setPortError(false);
        }
    }

    const handleMailAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMailAddress(e.target.value);
        if (e.target.validity.valid) {
            setMailAddressError(false);
        } else {
            setMailAddressError(true);
        }
    }

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
        if (e.target.value.length <= 0) {
            setPasswordError(true);
        } else {
            setPasswordError(false);
        }
    }

    const handleSecurityChange = (e:SelectChangeEvent<string>) => {
        setSecurity(e.target.value);
        switch(e.target.value) {
            case "NONE":
                setPort(25);
                break;
            case "STARTTLS":
                setPort(587);
                break;
            case "SSL/TLS":
                setPort(465);
                break;
        }
    }

    const testAndAddAccount = () => {
        // 유효성 검사
        if (description.length === 0) {
            setDescriptionError(true);
            return;
        }
        if (host.length === 0) {
            setHostError(true);
            return;
        }
        if (port < 1 || port > 65535) {
            setPortError(true);
            return;
        }
        if (mailAddress.length === 0 || !mailAddress.includes("@")) {
            setMailAddressError(true);
            return;
        }
        if (password.length === 0) {
            setPasswordError(true);
            return;
        }
        console.log("Validation");
        ipcRenderer.send("validateSmtp", {
            host: host,
            port: port,
            tls: security === "SSL/TLS",
            user: mailAddress,
            pass: password
        });
        ipcRenderer.once("validateSmtpReply", (eve:any, res:any) => {
            if (res === true) {
                ipcRenderer.send("addSendAccount", {
                    description: description,
                    host: host,
                    port: port,
                    security: security,
                    username: username,
                    emailAddress: mailAddress,
                    password: password
                });
                handleClose();
            } else {
                alert("Invalid SMTP Server");
            }
        });
    }

    return (
        <Dialog open={open}>
            <DialogTitle>Add Send Account</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    required
                    fullWidth
                    variant="standard"
                    label="Description"
                    value={description}
                    error={discriptionError}
                    helperText={discriptionError ? "Description is required" : ""}
                    onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleDiscriptionChange(e)}
                />
                <TextField
                    required
                    fullWidth
                    variant="standard"
                    label="Host"
                    value={host}
                    error={hostError}
                    helperText={hostError ? "Host is required" : ""}
                    onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleHostChange(e)}
                />
                <TextField 
                    required
                    fullWidth
                    variant="standard"
                    label="Port"
                    type="number"
                    value={port}
                    error={portError}
                    helperText={portError ? "Port is invalid" : ""}
                    onChange={(e:React.ChangeEvent<HTMLInputElement>) => handlePortChange(e)}
                />
                <FormControl variant="standard" fullWidth>
                    <InputLabel>Security</InputLabel>
                    <Select
                        required
                        fullWidth
                        variant="standard"
                        label="Security"
                        value={security}
                        onChange={(e: SelectChangeEvent<string>) => handleSecurityChange(e)}
                    >
                        <MenuItem value="NONE">None</MenuItem>
                        <MenuItem value="SSL/TLS">SSL/TLS</MenuItem>
                        <MenuItem value="STARTTLS">STARTTLS</MenuItem>
                    </Select>
                </FormControl>
                <TextField
                    fullWidth
                    variant="standard"
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <TextField
                    required
                    fullWidth
                    variant="standard"
                    label="Mail Address"
                    value={mailAddress}
                    error={mailAddressError}
                    type="email"
                    helperText={mailAddressError ? "Mail Address is invalid" : ""}
                    onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleMailAddressChange(e)}
                />
                <TextField
                    required
                    fullWidth
                    variant="standard"
                    label="Password"
                    type="password"
                    value={password}
                    error={passwordError}
                    helperText={passwordError ? "Password is required" : ""}
                    onChange={(e:React.ChangeEvent<HTMLInputElement>) => handlePasswordChange(e)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={testAndAddAccount}>Add Account</Button>
            </DialogActions>
        </Dialog>
    )
}