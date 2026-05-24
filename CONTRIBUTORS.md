* [medazizktata25](https://github.com/medazizktata25)
* [hchalouati](https://github.com/hchalouati)
* [khaliltbn](https://github.com/khaliltbn)
* [YassineCommits](https://github.com/YassineCommits)
* [aymennasri](https://github.com/aymennasri)
* [rebhimohamedamine](https://github.com/rebhimohamedamine)
* [mrebhi-art](https://github.com/mrebhi-art)
* [YGhorbel](https://github.com/YGhorbel)

```shell
p=1;
while true; do
    s=$(curl "https://api.github.com/repos/Guepard-Corp/qwery-core/contributors?page=$p") || break
    [ "0" = $(echo $s | jq length) ] && break
    echo $s | jq -r '.[] | "* [" + .login + "](" + .html_url + ")"'
    p=$((p+1))
done
```