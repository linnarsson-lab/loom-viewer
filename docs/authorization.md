### Authorizing access to Loom datasets

When you run a public server (or a server for yourself and your collaborators), you may want to control
access. Loom provides a very simple authorization system for this purpose.

**Note: Projects are public and read-only by default**

Anyone can browse datasets in public projects, but no-one can upload new datasets.

To restrict access, create a file `auth.txt` and place it in the project folder. The project now
becomes private, and access is controlled by the contents of the file. 

To allow access using the `auth.txt` file, add one or more lines of text, each with three comma-separated fields. For example:

```
slinnarsson,secret23,r
bossejansson,pw87987shjh,w
```

The fields are: the *username*, the *password* and the *mode* (either `r` or `w`). With the file above, user `slinnarsson` 
has read-only access, while `bossejansson` can both read and upload datasets.

Finally, to provide read-only access to *all* users, include a wildcard line: `*,*,r`. It is not possible to give
read/write permissions to anonymous users.


In summary:

|Setting          | Effect |
|-----------------|--------|
|No `auth.txt` file | Project is public and read-only|
|Empty `auth.txt` file | Project is private and inaccessible to all|
|`username,password,r` | Read-only access for specified user|
|`username,password,w` | Read/write access for specified user|
|`*,*,r` | Read-only access for all users, including anonymous|
|`*,*,w` | (ignored)|


### A word of caution

Loom authorization is intentionally lightweight and simple. Usernames and passwords are transmitted in the clear and
stored in the clear on the server. An adversary could intercept internet traffic and capture the credentials.
For this reason, **do not*:

* Allow users to choose their passwords (they will reuse the password from their bank)
* Store highly sensitive datasets on a Loom server. 

In other words, Loom security is like the lock on your office door. It keeps reasonable people from entering, but is
not sure to prevent theft of your credit card if you leave it on the table.

We recommend running Loom on a virtual machine on its own.




