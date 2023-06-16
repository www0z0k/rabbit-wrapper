Minimum sample:

```
import RabbitMQWrapper, { getConnection } from './index';

const wrapper = getConnection('<host>', <port>, '<login>', '<password>');

// dot-separated channel.queue, channel/queue options may be passed as optional args
wrapper.prepareConsumer <any>('tests.test1', (message: any) => {
    console.log(message);
});

let counter = 0;

// dot-separated channel.queue, channel/queue options may be passed as optional args
const wrapped = wrapper.wrapPublisher <any>('testtes.test1');

setInterval(() => {
    wrapped({test: `test${counter++}`});
}, 1000);
```

expected output:
```
{ test: 'test0' }
{ test: 'test1' }
{ test: 'test2' }
{ test: 'test3' }
{ test: 'test4' }
```