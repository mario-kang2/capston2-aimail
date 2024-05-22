import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from "@mui/material";
import { useState } from "react";

export interface AddAccountDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function AddAccountDialog(props: AddAccountDialogProps) {
    const {open, onClose} = props;
    const {ipcRenderer} = window.require("electron");

    const [description, setDescription] = useState("");
    const [host, setHost] = useState("");
    const [protocol, setProtocol] = useState("imap");
    const [port, setPort] = useState(993);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [mailAddress, setMailAddress] = useState("");
    const [security, setSecurity] = useState("ssl");

    const [discriptionError, setDescriptionError] = useState(false);
    const [hostError, setHostError] = useState(false);
    const [portError, setPortError] = useState(false);
    const [mailAddressError, setMailAddressError] = useState(false);
    const [passwordError, setPasswordError] = useState(false);

    var addressErrorText = "";

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

    const handleProtocolChange = (e: SelectChangeEvent<string>) => {
        setProtocol(e.target.value);
        if (e.target.value === "pop3") {
            switch (security) {
                case "none":
                    setPort(110);
                    break;
                case "ssl":
                    setPort(995);
                    break;
                case "starttls":
                    setPort(995);
                    break;
            }
        } else {
            switch (security) {
                case "none":
                    setPort(143);
                    break;
                case "ssl":
                    setPort(993);
                    break;
                case "starttls":
                    setPort(993);
                    break;
            }
        }
    }

    const handleSecurityChange = (e: SelectChangeEvent<string>) => {
        setSecurity(e.target.value);
        if (protocol === "pop3") {
            switch (e.target.value) {
                case "none":
                    setPort(110);
                    break;
                case "ssl":
                    setPort(995);
                    break;
                case "starttls":
                    setPort(995);
                    break;
            }
        }
        else {
            switch (e.target.value) {
                case "none":
                    setPort(143);
                    break;
                case "ssl":
                    setPort(993);
                    break;
                case "starttls":
                    setPort(993);
                    break;
            }
        }
    }

    const handleClose = () => {
        onClose();
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
        if (protocol === "imap") {
            ipcRenderer.send("validateImap", {
                host: host,
                port: port,
                tls: security === "starttls" || security === "ssl",
                user: mailAddress,
                password: password
            });
            ipcRenderer.once('validateImapReply', (eve:any, res:any) => {
                if (res === true) {
                    ipcRenderer.send("addAccount", {
                        description: description,
                        host: host,
                        protocol: protocol,
                        port: port,
                        security: security,
                        emailAddress: mailAddress,
                        password: password,
                        username: username
                    });
                    handleClose();
                }
            });
        }
        else {

        }
    }

    return (
        <Dialog open={open}>
            <DialogTitle>Add Account</DialogTitle>
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
                <FormControl variant="standard" fullWidth>
                    <InputLabel>Protocol</InputLabel>
                    <Select
                        required
                        fullWidth
                        variant="standard"
                        label="Protocol"
                        value={protocol}
                        onChange={(e: SelectChangeEvent<string>) => handleProtocolChange(e)}
                    >
                        <MenuItem value="imap">IMAP</MenuItem>
                        <MenuItem value="pop3">POP3</MenuItem>
                    </Select>
                </FormControl>
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
                        <MenuItem value="none">None</MenuItem>
                        <MenuItem value="ssl">SSL</MenuItem>
                        <MenuItem value="starttls">STARTTLS</MenuItem>
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
                <DialogContentText id="addressErrorDescription">{addressErrorText}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={testAndAddAccount}>Add Account</Button>
            </DialogActions>
        </Dialog>
    )
}