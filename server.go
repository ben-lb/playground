package main

import (
	"html/template"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
	"io/ioutil"
	"encoding/json"
	"os/exec"
	"bytes"
	"fmt"
	"strings"
	"path"
)

func main() {
	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))
	http.HandleFunc("/", serveTemplate)
	http.HandleFunc("/machines", getMachines)
	http.HandleFunc("/ssh", ssh)
	http.HandleFunc("/serial", serial)
	http.HandleFunc("/run_test", runTest)

	log.Println("Listening...")
	http.ListenAndServe(":3000", nil)
}

func isCommandAvailable(name string) bool {
	cmd := exec.Command("/bin/sh", "-c", "command -v " + name)
	if err := cmd.Run(); err != nil {
		return false
	}
	return true
}

func runCmd(cmdStr string) (string, string) {
	cmd := exec.Command("/bin/sh", "-c", cmdStr)
	//additionalEnv := "INTERACTIVE=FALSE"
    //newEnv := append(os.Environ(), additionalEnv)
    //cmd.Env = newEnv
    var out, stderr bytes.Buffer
    cmd.Stdout = &out
	cmd.Stderr = &stderr
	err := cmd.Run()
	if err != nil {
		fmt.Println(fmt.Sprint(err) + ": " + stderr.String())
	}
	fmt.Println("Result: " + out.String())
	return out.String(), stderr.String()
}

func ssh(w http.ResponseWriter, r *http.Request) {
	if !isCommandAvailable("sshpass") {
		http.Error(w, "sshpass is not installed on your computer", http.StatusInternalServerError)
		return
	}
	if !isCommandAvailable("gnome-terminal") {
		http.Error(w, "gnome-terminal is not installed on your computer", http.StatusInternalServerError)
		return
	}
	type reqBody struct {
		Hostname string
	}
	var body reqBody
	err := json.NewDecoder(r.Body).Decode(&body)

	if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
		return
    }

	var resErr string
	cmd := fmt.Sprintf("gnome-terminal -- sh -c 'sshpass -p 'light' ssh -o StrictHostKeyChecking=no root@%s'", body.Hostname)
	stdout, resErr := runCmd(cmd)
	//stdout, err := runCmd("dockerize testos_cli --uri tcp://labgw:22222 -t virtual -r rootfs_product_centos")
	if resErr != "" {
		log.Println(resErr)
	}
	// create json response from struct
	a, err := json.Marshal(stdout)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
		return
    }
    w.Write(a)
}

func serial(w http.ResponseWriter, r *http.Request) {
	if !isCommandAvailable("gnome-terminal") {
		http.Error(w, "gnome-terminal is not installed on your computer", http.StatusInternalServerError)
		return
	}
	type reqBody struct {
		Hostname string
	}
	var body reqBody
	err := json.NewDecoder(r.Body).Decode(&body)

	if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }

	var resErr string
	cmd := fmt.Sprintf("gnome-terminal -- sh -c 'dockerize serialf %s; bash'", body.Hostname)
	stdout, resErr := runCmd(cmd)
	if resErr != "" {
		log.Println(resErr)
	}
	// create json response from struct
	a, err := json.Marshal(stdout)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }
    w.Write(a)
}

func runTest(w http.ResponseWriter, r *http.Request) {
	if !isCommandAvailable("gnome-terminal") {
		http.Error(w, "gnome-terminal is not installed on your computer", http.StatusInternalServerError)
		return
	}
	type reqBody struct {
		Pylint bool
		Debug bool
		TestFilePath string
		RootfsType string
		RootfsLabel string
	}
	var body reqBody
	err := json.NewDecoder(r.Body).Decode(&body)

	if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }

	var resErr string
	workspace := os.Getenv("WORKSPACE_TOP")
	relPath := strings.TrimPrefix(body.TestFilePath, workspace)
	subDir := strings.Split(relPath, "/")[1]
	newSubPath := path.Join(workspace, subDir)
	rackTestPath := strings.TrimPrefix(body.TestFilePath, newSubPath)[1:]
	var pylint, debug, rootfs string
	if body.Pylint {
		pylint = "--pylint"
	}
	if body.Debug {
		debug = "--debug"
	}
	if body.RootfsType != "" && body.RootfsLabel != "" {
		rootfs = fmt.Sprintf("%s=%s", body.RootfsType, body.RootfsLabel)
	}

	cmd := fmt.Sprintf("gnome-terminal -- sh -c 'cd %s; %s dockerize run_test.sh %s %s %s; bash'", newSubPath,
		rootfs, rackTestPath, pylint, debug)
	stdout, resErr := runCmd(cmd)
	if resErr != "" {
		log.Println(resErr)
	}
	// create json response from struct
	a, err := json.Marshal(stdout)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }
    w.Write(a)
}

func getMachines(w http.ResponseWriter, req *http.Request) {
    url := "http://labgw:8080/machines"

	spaceClient := http.Client{
		Timeout: time.Second * 10, // Maximum of 10 secs
	}

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		log.Fatal(err)
	}

	req.Header.Set("User-Agent", "spacecount-tutorial")

	res, getErr := spaceClient.Do(req)
	if getErr != nil {
		log.Fatal(getErr)
	}


	// Read body
	b, err := ioutil.ReadAll(res.Body)
	defer res.Body.Close()
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	// Unmarshal
	var msg []interface{}
	err = json.Unmarshal(b, &msg)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	output, err := json.Marshal(msg)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.Header().Set("content-type", "application/json")
	w.Write(output)
}

func serveTemplate(w http.ResponseWriter, r *http.Request) {
	lp := filepath.Join("templates", "index.html")
	fp := filepath.Join("templates", filepath.Clean(r.URL.Path))

	// Return a 404 if the template doesn't exist
	info, err := os.Stat(fp)
	if err != nil {
		if os.IsNotExist(err) {
			http.NotFound(w, r)
			return
		}
	}

	// Return a 404 if the request is for a directory
	if info.IsDir() {
		http.NotFound(w, r)
		return
	}

	tmpl, err := template.ParseFiles(lp, fp)
	if err != nil {
		// Log the detailed error
		log.Println(err.Error())
		// Return a generic "Internal Server Error" message
		http.Error(w, http.StatusText(500), 500)
		return
	}

	if err := tmpl.ExecuteTemplate(w, "index", nil); err != nil {
		log.Println(err.Error())
		http.Error(w, http.StatusText(500), 500)
	}
}