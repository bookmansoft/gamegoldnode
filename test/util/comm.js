async function waiting(ms) {
    await (async function(){return new Promise((resolve, reject)=>{setTimeout(()=>{resolve();}, ms);});})();
}

module.exports = {
    waiting: waiting
}