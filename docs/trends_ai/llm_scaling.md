### Introduction to LLM-Scaling
As seasoned experts with 30 years of experience, we're excited to share our knowledge on scaling large language models. In this masterclass, we'll delve into the challenges of LLM-scaling, sharing a war story, exploring an architectural bottleneck, and providing a practical code snippet.

### War Story: Distributed Training
We recall a project where we needed to train a massive language model on a large corpus of text data. Our initial approach was to use a single machine, but we quickly hit the memory ceiling. We switched to a distributed training setup, using multiple machines to split the workload. However, this introduced new challenges, such as synchronizing model updates and handling communication overhead. After weeks of tuning, we achieved a 5x speedup in training time.

### Architectural Bottleneck: Memory Bandwidth
A major bottleneck in LLM-scaling is memory bandwidth. As model sizes increase, the amount of data transferred between memory and processing units becomes a significant limiting factor. To mitigate this, we can use techniques like model parallelism, which splits the model across multiple devices, reducing the memory bandwidth requirements.

### Practical Example: CLI Command
To demonstrate model parallelism, let's use the following CLI command:
```bash
python -m torch.distributed.launch --nproc_per_node=4 train.py --model_parallel
```
This command launches a distributed training process with 4 processes per node, enabling model parallelism. The `train.py` script should be modified to support model parallelism using a library like PyTorch.

In conclusion, LLM-scaling requires careful consideration of architectural bottlenecks and distributed training strategies. By sharing our experiences and providing practical examples, we hope to equip our students with the knowledge to tackle the challenges of scaling large language models. With the right tools and techniques, you can overcome the limitations of memory bandwidth and achieve significant speedups in training time. Remember to experiment with different approaches and stay up-to-date with the latest developments in the field.