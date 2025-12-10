import os
import sys
import subprocess
import zipfile
import tempfile
import requests
from tqdm import tqdm
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import json

# ComfyUI 节点基类
class HiveModelDownloader:
    """
    模型下载器节点
    用户可以粘贴模型文件的下载地址，选择保存目录，然后下载
    """
    @classmethod
    def INPUT_TYPES(cls):
        # 获取 models 目录的子目录列表
        def get_models_subdirs():
            try:
                current_dir = os.path.dirname(os.path.abspath(__file__))
                comfyui_root = None
                check_dir = current_dir
                for _ in range(5):
                    if os.path.exists(os.path.join(check_dir, "models")):
                        comfyui_root = check_dir
                        break
                    parent = os.path.dirname(check_dir)
                    if parent == check_dir:
                        break
                    check_dir = parent
                
                if comfyui_root:
                    models_dir = os.path.join(comfyui_root, "models")
                    if os.path.exists(models_dir):
                        subdirs = []
                        for item in os.listdir(models_dir):
                            item_path = os.path.join(models_dir, item)
                            if os.path.isdir(item_path):
                                subdirs.append(item)
                        return subdirs if subdirs else ["checkpoints", "loras", "vae", "upscale_models", "controlnet"]
            except:
                pass
            return ["checkpoints", "loras", "vae", "upscale_models", "controlnet"]
        
        models_subdirs = get_models_subdirs()
        
        return {
            "required": {
                "url": ("STRING", {
                    "name": "模型地址/model_url",
                    "multiline": False,
                    "default": "",
                    "placeholder": "请将模型地址粘贴进来",
                    "tooltip": "请将模型地址粘贴进来 / please paste the model address here"
                }),
                "save_directory": (models_subdirs, {
                    "name": "选择模型保存目录/select model save directory",
                    "tooltip": "选择模型保存目录 / select the model save directory",
                    "default": models_subdirs[0] if models_subdirs else "checkpoints"
                }),
            },
            "optional": {}
        }
    
    RETURN_TYPES = ()
    FUNCTION = "download_model"
    OUTPUT_NODE = True
    CATEGORY = "Hive/Download"
    # 注意语言文件中不能用@符号
    DESCRIPTION = "模型下载器 - 粘贴模型文件的下载地址，选择保存目录，然后下载。支持多线程下载以提高速度。/ Model downloader node - paste the download address of model files, select a save directory, and download them. Supports multi-threaded downloading for faster speeds. - Github: https://github.com/luguoli - 📧Email: luguoli﹫vip.qq.com"


    
    def download_model(self, url, save_directory="checkpoints"):
        """
        下载模型文件
        
        Args:
            url: 模型文件的下载地址
            save_directory: 保存目录名称（models 下的子目录）
        
        Returns:
            status: 下载状态信息
        """
        if not url or not url.strip():
            return {"ui": {"text": ["错误: 请提供有效的下载地址 / Error: Please provide a valid download URL"]}}
        
        url = url.strip()
        
        try:
            # 尝试找到 ComfyUI 的 models 目录
            current_dir = os.path.dirname(os.path.abspath(__file__))
            # 向上查找 ComfyUI 根目录
            comfyui_root = None
            check_dir = current_dir
            for _ in range(5):  # 最多向上查找5层
                if os.path.exists(os.path.join(check_dir, "models")):
                    comfyui_root = check_dir
                    break
                parent = os.path.dirname(check_dir)
                if parent == check_dir:
                    break
                check_dir = parent
            
            if comfyui_root:
                save_directory_path = os.path.join(comfyui_root, "models", save_directory)
            else:
                # 如果找不到，使用当前目录下的 models 文件夹
                save_directory_path = os.path.join(current_dir, "models", save_directory)
            
            save_directory_path = os.path.abspath(save_directory_path)
            
            # 创建目录（如果不存在）
            os.makedirs(save_directory_path, exist_ok=True)
            
            # 获取文件名
            filename = os.path.basename(url.split('?')[0])  # 移除查询参数
            if not filename or '.' not in filename:
                # 如果无法从URL获取文件名，尝试从Content-Disposition获取
                filename = "downloaded_model.bin"
            
            save_path = os.path.join(save_directory_path, filename)
            
            # 检查文件是否已存在
            if os.path.exists(save_path):
                file_size = os.path.getsize(save_path)
                file_size_mb = file_size / (1024 * 1024)
                return {"ui": {"text": [f"⚠️ 文件已存在，跳过下载 / File already exists, skipping download\n文件路径 / File path: {save_path}\n文件大小 / File size: {file_size_mb:.2f} MB\n\n如需重新下载，请先删除现有文件或更改保存位置 / To re-download, please delete the existing file or change the save location"]}}
            
            # 开始下载
            print(f"开始下载 / Starting download: {url}")
            print(f"保存到 / Saving to: {save_path}")
            status_msg = f"开始下载 / Starting download: {url}\n"
            
            # 先获取文件信息（使用临时session，避免连接复用问题）
            with requests.Session() as tmp_session:
                tmp_session.headers.update({
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })
                head_response = tmp_session.head(url, allow_redirects=True, timeout=30)
                head_response.raise_for_status()
            
            # 获取文件大小
            total_size = int(head_response.headers.get('content-length', 0))
            
            # 检查服务器是否支持 Range 请求（多线程下载需要）
            supports_range = head_response.headers.get('accept-ranges', '').lower() == 'bytes'
            
            if total_size > 0 and supports_range:
                # 使用多线程下载（支持 Range 请求）
                # 对于超大文件（>10GB），限制线程数避免过多临时文件
                # 每个线程处理约500MB-1GB的数据比较合理
                if total_size > 10 * 1024 * 1024 * 1024:  # 大于10GB
                    num_threads = min(8, max(4, total_size // (1024 * 1024 * 1024)))  # 每GB一个线程，最多8个
                else:
                    num_threads = min(8, max(4, total_size // (10 * 1024 * 1024)))  # 每10MB一个线程，最多8个
                chunk_size = total_size // num_threads
                
                print(f"使用 {num_threads} 个线程进行多线程下载... / Using {num_threads} threads for multi-threaded download...")
                
                # 创建临时文件来存储各个分片
                temp_files = {}  # 使用字典，以 chunk_id 为键
                threads = []
                downloaded_chunks = [0] * num_threads
                lock = threading.Lock()
                
                def download_chunk(chunk_id, start, end):
                    """下载文件的一个分片"""
                    # 【关键修复】每个线程创建独立的Session，避免连接池竞争和死锁
                    local_session = requests.Session()
                    local_session.headers.update({
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    })
                    
                    temp_file_path = None
                    temp_file = None
                    try:
                        headers = {'Range': f'bytes={start}-{end}'}
                        expected_size = end - start + 1
                        
                        # 将临时文件放在目标目录附近，避免系统临时目录空间不足的问题
                        # 对于超大文件，这样可以更好地控制临时文件位置
                        temp_dir = os.path.dirname(save_path)
                        temp_file_path = os.path.join(temp_dir, f'.{os.path.basename(save_path)}.part{chunk_id}.tmp')
                        
                        temp_file = open(temp_file_path, 'wb')
                        
                        # 使用锁保护字典写入操作
                        with lock:
                            temp_files[chunk_id] = temp_file_path
                        
                        # 对于中等大小的分片（<100MB），不使用 stream，直接获取全部内容
                        # 这样可以避免流式读取可能的阻塞问题
                        if expected_size < 100 * 1024 * 1024:  # 小于100MB
                            # 不使用 stream=True，直接获取完整响应
                            response = local_session.get(url, headers=headers, stream=False, timeout=(30, 300))
                            response.raise_for_status()
                            
                            # 检查响应状态码
                            if response.status_code not in [200, 206]:
                                raise Exception(f"分片 {chunk_id} 响应状态码错误: {response.status_code} / Chunk {chunk_id} response status code error: {response.status_code}")
                            
                            content = response.content
                            if not content or len(content) == 0:
                                raise Exception(f"分片 {chunk_id} 响应内容为空 / Chunk {chunk_id} response content is empty")
                            
                            chunk_downloaded = len(content)
                            temp_file.write(content)
                            temp_file.flush()
                            
                            # 更新进度
                            with lock:
                                downloaded_chunks[chunk_id] = chunk_downloaded
                        else:
                            # 对于大分片（>=100MB），统一使用流式读取
                            # 之前的直接读取方式对于大文件可能会阻塞，所以改为统一使用流式下载
                            # 根据分片大小动态调整超时时间
                            min_speed_mbps = 1.0  # 最低1MB/s
                            estimated_time = (expected_size / (1024 * 1024)) / min_speed_mbps  # 秒
                            # 连接超时60秒，读取超时为估算时间的2倍，最少300秒，最多1800秒（30分钟）
                            read_timeout = max(300, min(1800, int(estimated_time * 2)))
                            chunk_timeout = (60, read_timeout)
                            
                            response = local_session.get(url, headers=headers, stream=True, timeout=chunk_timeout)
                            response.raise_for_status()
                            
                            # 检查响应状态码
                            if response.status_code not in [200, 206]:
                                raise Exception(f"分片 {chunk_id} 响应状态码错误: {response.status_code} / Chunk {chunk_id} response status code error: {response.status_code}")
                            
                            # 检查Content-Range头，确保响应是正确的范围
                            content_range = response.headers.get('Content-Range', '')
                            if content_range and chunk_id == 0:
                                # 验证第一个分片的范围是否正确
                                if 'bytes 0-' not in content_range:
                                    print(f"[警告] 分片0的Content-Range可能异常: {content_range} / [Warning] Chunk 0 Content-Range may be abnormal: {content_range}")
                            
                            chunk_downloaded = 0
                            # 根据分片大小调整更新间隔：大文件更新频率可以低一些
                            if expected_size > 1024 * 1024 * 1024:  # >1GB
                                update_interval = 50 * 1024 * 1024  # 每50MB更新一次进度
                                flush_interval = 100 * 1024 * 1024  # 每100MB刷新一次（减少IO）
                            else:
                                update_interval = 5 * 1024 * 1024  # 每5MB更新一次进度
                                flush_interval = 20 * 1024 * 1024  # 每20MB刷新一次
                            
                            last_update_size = 0
                            last_flush_size = 0
                            
                            # 使用 iter_content 流式读取
                            # 统一使用1MB块大小，避免过大Buffer触发防火墙流量整形，提高稳定性
                            iter_chunk_size = 1024 * 1024  # 统一使用1MB块
                            has_data = False
                            last_chunk_time = time.time()  # 记录最后一次收到数据的时间
                            chunk_read_timeout = 120  # 如果120秒没有收到新数据块，认为连接可能中断
                            
                            # 对于第一个分片，立即更新进度（即使只有很少的数据），确保进度可见
                            first_chunk_received = False
                            
                            for chunk in response.iter_content(chunk_size=iter_chunk_size):
                                current_time = time.time()
                                if chunk:
                                    has_data = True
                                    last_chunk_time = current_time
                                    temp_file.write(chunk)
                                    chunk_downloaded += len(chunk)
                                    
                                    # 对于第一个分片的第一个数据块，立即更新进度
                                    if chunk_id == 0 and not first_chunk_received:
                                        with lock:
                                            downloaded_chunks[chunk_id] = chunk_downloaded
                                        first_chunk_received = True
                                    
                                    # 每次收到数据都检查是否需要刷新和更新进度
                                    if chunk_downloaded - last_flush_size >= flush_interval:
                                        temp_file.flush()
                                        last_flush_size = chunk_downloaded
                                    
                                    # 更频繁地更新进度，特别是对于前几个数据块
                                    # 前10MB每1MB更新一次，之后按正常间隔
                                    force_update = chunk_downloaded < 10 * 1024 * 1024 and (chunk_downloaded - last_update_size >= 1024 * 1024)
                                    if force_update or chunk_downloaded - last_update_size >= update_interval:
                                        with lock:
                                            downloaded_chunks[chunk_id] = chunk_downloaded
                                        last_update_size = chunk_downloaded
                                else:
                                    # 如果收到空块，检查是否超时
                                    if has_data and current_time - last_chunk_time > chunk_read_timeout:
                                        raise Exception(f"分片 {chunk_id} 读取超时（{chunk_read_timeout}秒未收到数据，已下载 {chunk_downloaded / 1024 / 1024:.2f} MB） / Chunk {chunk_id} read timeout ({chunk_read_timeout}s no data, downloaded {chunk_downloaded / 1024 / 1024:.2f} MB)")
                            
                            if not has_data or chunk_downloaded == 0:
                                raise Exception(f"分片 {chunk_id} 未下载到任何数据 / Chunk {chunk_id} downloaded no data")
                            
                            # 最后刷新并更新进度
                            temp_file.flush()
                            with lock:
                                downloaded_chunks[chunk_id] = chunk_downloaded
                        
                        # 最后刷新并更新最终进度（对于流式下载，进度已在循环中更新；对于直接读取，进度也已更新）
                        if temp_file:
                            temp_file.flush()
                        
                        # 关闭文件
                        if temp_file:
                            temp_file.close()
                        
                        # 验证分片大小
                        actual_size = os.path.getsize(temp_file_path)
                        if actual_size != expected_size:
                            raise Exception(f"分片 {chunk_id} 大小不匹配: 期望 {expected_size} 字节，实际 {actual_size} 字节 / Chunk {chunk_id} size mismatch: expected {expected_size} bytes, got {actual_size} bytes")
                        
                        return chunk_id, True, temp_file_path
                    except Exception as e:
                        error_detail = f"分片 {chunk_id} 下载失败: {str(e)} / Chunk {chunk_id} download failed: {str(e)}"
                        print(f"[错误] {error_detail}")
                        import traceback
                        traceback.print_exc()  # 打印完整堆栈跟踪
                        # 确保文件已关闭
                        if temp_file:
                            try:
                                temp_file.close()
                            except:
                                pass
                        # 清理失败的临时文件
                        if temp_file_path and os.path.exists(temp_file_path):
                            try:
                                os.unlink(temp_file_path)
                            except:
                                pass
                        return chunk_id, False, None
                    finally:
                        # 【关键修复】务必关闭独立的Session，释放连接资源
                        try:
                            local_session.close()
                        except:
                            pass
                
                # 启动多线程下载
                with ThreadPoolExecutor(max_workers=num_threads) as executor:
                    futures = []
                    for i in range(num_threads):
                        start = i * chunk_size
                        end = start + chunk_size - 1 if i < num_threads - 1 else total_size - 1
                        future = executor.submit(download_chunk, i, start, end)
                        futures.append(future)
                    
                    # 显示进度并实时写入进度文件（供前端读取）
                    last_progress = 0
                    last_total_downloaded = 0
                    progress_updates = []
                    stall_count = 0  # 检测是否卡住
                    check_count = 0  # 循环计数器，用于给初始下载一些缓冲时间
                    min_check_cycles = 15  # 至少循环15次（约5秒）后才开始检测停滞，给下载启动时间
                    
                    while any(not f.done() for f in futures):
                        # 使用锁读取进度数组，确保数据一致性
                        with lock:
                            total_downloaded = sum(downloaded_chunks)
                        
                        progress = (total_downloaded / total_size * 100) if total_size > 0 else 0
                        check_count += 1
                        
                        # 只在有实际进度后，并且已经过了初始缓冲期，才检测停滞
                        has_progress = total_downloaded > 0
                        past_initial_period = check_count >= min_check_cycles
                        
                        # 检测进度是否停滞（超过15秒没有变化，且已经有了一些进度）
                        if has_progress and past_initial_period and total_downloaded == last_total_downloaded:
                            stall_count += 1
                            # 只有超过15秒（约45个循环）没有进展才警告
                            if stall_count >= 45:  # 15秒（45 * 0.33秒）
                                # 显示每个线程的状态
                                with lock:
                                    status_info = []
                                    for i in range(num_threads):
                                        chunk_start = i * chunk_size
                                        chunk_end = chunk_start + chunk_size - 1 if i < num_threads - 1 else total_size - 1
                                        chunk_total = chunk_end - chunk_start + 1
                                        chunk_progress = (downloaded_chunks[i] / chunk_total * 100) if chunk_total > 0 else 0
                                        is_done = futures[i].done()
                                        chunk_mb = downloaded_chunks[i] / 1024 / 1024
                                        total_mb = chunk_total / 1024 / 1024
                                        status_info.append(f"T{i}:{chunk_progress:.0f}%({chunk_mb:.1f}/{total_mb:.1f}MB){'✓' if is_done else '▶'}")
                                    # 只在有实际卡住的分片时才显示警告（不是所有线程都完成了）
                                    if any(not futures[i].done() for i in range(num_threads)):
                                        print(f"\n⚠️ 进度可能停滞 / Progress may be stalled: {' | '.join(status_info)}")
                                
                                stall_count = 0  # 重置计数器
                        else:
                            stall_count = 0
                            last_total_downloaded = total_downloaded
                        
                        if int(progress) != last_progress:
                            progress_text = f"下载进度 / Download progress: {progress:.1f}% ({total_downloaded / 1024 / 1024:.2f} MB / {total_size / 1024 / 1024:.2f} MB)"
                            print(f"\r{progress_text}", end='', flush=True)
                            last_progress = int(progress)
                            
                            # 保存最新的进度更新
                            progress_updates.append(progress_text)
                            if len(progress_updates) > 10:
                                progress_updates.pop(0)  # 只保留最近10条
                        
                        time.sleep(0.33)  # 约每0.33秒更新一次（更频繁以检测停滞）
                    
                    # 等待所有线程完成
                    results = [f.result() for f in futures]
                    
                    # 检查是否所有分片都下载成功
                    failed_chunks = [r[0] for r in results if not r[1]]
                    if failed_chunks:
                        # 清理所有临时文件
                        for i in range(num_threads):
                            if i in temp_files:
                                try:
                                    os.unlink(temp_files[i])
                                except:
                                    pass
                        raise Exception(f"部分分片下载失败 / Some chunks failed to download: {failed_chunks}")
                
                print()  # 换行
                
                # 合并分片（按 chunk_id 顺序合并，确保文件顺序正确）
                print("合并下载的分片... / Merging downloaded chunks...")
                try:
                    # 使用流式合并，避免大文件一次性加载到内存
                    chunk_copy_size = 64 * 1024 * 1024  # 每次复制64MB，适合大文件
                    with open(save_path, 'wb') as f:
                        for i in range(num_threads):
                            if i not in temp_files:
                                raise Exception(f"分片 {i} 的临时文件不存在 / Temporary file for chunk {i} does not exist")
                            temp_file_path = temp_files[i]
                            if not os.path.exists(temp_file_path):
                                raise Exception(f"分片 {i} 的临时文件不存在 / Temporary file for chunk {i} does not exist: {temp_file_path}")
                            
                            # 流式复制，避免一次性加载大文件到内存
                            with open(temp_file_path, 'rb') as tf:
                                while True:
                                    chunk_data = tf.read(chunk_copy_size)
                                    if not chunk_data:
                                        break
                                    f.write(chunk_data)
                            
                            # 删除临时文件
                            os.unlink(temp_file_path)
                    
                    # 验证最终文件大小
                    final_size = os.path.getsize(save_path)
                    if final_size != total_size:
                        raise Exception(f"文件大小不匹配: 期望 {total_size} 字节，实际 {final_size} 字节 / File size mismatch: expected {total_size} bytes, got {final_size} bytes")
                    
                except Exception as e:
                    # 清理所有临时文件
                    for i in range(num_threads):
                        if i in temp_files:
                            try:
                                if os.path.exists(temp_files[i]):
                                    os.unlink(temp_files[i])
                            except:
                                pass
                    # 如果最终文件已创建但不完整，删除它
                    if os.path.exists(save_path):
                        try:
                            os.unlink(save_path)
                        except:
                            pass
                    raise
                
                
            else:
                # 单线程下载（不支持 Range 或文件大小未知）
                print("使用单线程下载... / Using single-threaded download...")
                # 创建独立的Session用于单线程下载
                with requests.Session() as single_session:
                    single_session.headers.update({
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    })
                    response = single_session.get(url, stream=True, timeout=(30, 300))
                    response.raise_for_status()
                    
                    downloaded_size = 0
                    block_size = 4 * 1024 * 1024  # 4MB 块大小
                    
                    with open(save_path, 'wb') as f:
                        if total_size > 0:
                            last_write_time = 0
                            with tqdm(total=total_size, unit='B', unit_scale=True, desc=filename) as pbar:
                                for chunk in response.iter_content(chunk_size=block_size):
                                    if chunk:
                                        f.write(chunk)
                                        downloaded_size += len(chunk)
                                        pbar.update(len(chunk))
                                        progress = (downloaded_size / total_size * 100) if total_size > 0 else 0
                                        progress_text = f"下载进度 / Download progress: {progress:.1f}% ({downloaded_size / 1024 / 1024:.2f} MB / {total_size / 1024 / 1024:.2f} MB)"
                                        print(f"\r{progress_text}", end='', flush=True)
                                        
                        else:
                            for chunk in response.iter_content(chunk_size=block_size):
                                if chunk:
                                    f.write(chunk)
                                    downloaded_size += len(chunk)
                                    print(f"\r已下载 / Downloaded: {downloaded_size / 1024 / 1024:.2f} MB", end='', flush=True)
                            print()  # 换行
            
            print(f"✓ 下载完成 / Download completed: {save_path}")
            print("⚠️ 请重启 ComfyUI 以使新下载的模型生效 / Please restart ComfyUI for the newly downloaded model to take effect")
            
            # 构建最终消息（不包含进度信息和保存路径）
            final_msg = f"✓ 下载完成 / Download completed: {save_path}\n⚠️ 请重启 ComfyUI 以使新下载的模型生效 / Please restart ComfyUI for the newly downloaded model to take effect"
            return {"ui": {"text": [final_msg]}}
            
        except requests.exceptions.RequestException as e:
            error_msg = f"下载失败 / Download failed: {str(e)}"
            print(error_msg)
            return {"ui": {"text": [error_msg]}}
        except Exception as e:
            error_msg = f"发生错误 / Error occurred: {str(e)}"
            print(error_msg)
            return {"ui": {"text": [error_msg]}}


class HiveNodeInstaller:
    """
    节点安装器
    用户可以粘贴节点的安装地址（GitHub/GitLab/Gitee等），自动安装到 ComfyUI 的 custom_nodes 目录
    """
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "url": ("STRING", {
                    "name": "节点安装地址/node installation address",
                    "tooltip": "请将节点安装地址粘贴进来（GitHub/GitLab/Gitee等） / please paste the node installation address here (GitHub/GitLab/Gitee etc.)",
                    "multiline": False,
                    "default": "",
                    "placeholder": "请将节点安装地址粘贴进来（GitHub/GitLab/Gitee等）",
                }),
            },
            "optional": {}
        }
    
    RETURN_TYPES = ()
    FUNCTION = "install_node"
    OUTPUT_NODE = True
    CATEGORY = "Hive/Install"
    # 注意语言文件中不能用@符号
    DESCRIPTION = "节点安装器 - 粘贴节点的安装地址（GitHub/GitLab/Gitee等），自动安装到 ComfyUI 的 custom_nodes 目录。支持 Git 仓库和 ZIP 文件安装。/ Node installer - paste the installation address of nodes (GitHub/GitLab/Gitee, etc.) and automatically install them to ComfyUI's custom_nodes directory. Supports Git repository and ZIP file installation. - Github: https://github.com/luguoli - 📧Email: luguoli﹫vip.qq.com"
    
    def find_comfyui_custom_nodes_dir(self):
        """
        查找 ComfyUI 的 custom_nodes 目录
        
        Returns:
            custom_nodes 目录路径，如果找不到则返回 None
        """
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # 方法1: 当前文件就在 custom_nodes 目录下
        if os.path.basename(os.path.dirname(current_dir)) == "custom_nodes":
            return os.path.dirname(current_dir)
        
        # 方法2: 向上查找 custom_nodes 目录
        check_dir = current_dir
        for _ in range(5):  # 最多向上查找5层
            if os.path.basename(check_dir) == "custom_nodes":
                return check_dir
            parent = os.path.dirname(check_dir)
            if parent == check_dir:
                break
            check_dir = parent
        
        # 方法3: 查找 ComfyUI 根目录下的 custom_nodes
        check_dir = current_dir
        for _ in range(5):
            custom_nodes_path = os.path.join(check_dir, "custom_nodes")
            if os.path.exists(custom_nodes_path) and os.path.isdir(custom_nodes_path):
                return custom_nodes_path
            parent = os.path.dirname(check_dir)
            if parent == check_dir:
                break
            check_dir = parent
        
        return None
    
    def normalize_git_url(self, url):
        """
        规范化 Git URL
        
        Args:
            url: 原始 URL
        
        Returns:
            规范化后的 Git URL
        """
        url = url.strip()
        
        # 移除末尾的斜杠
        url = url.rstrip('/')
        
        # 如果是 GitHub/GitLab/Gitee 的网页链接，转换为 Git URL
        if 'github.com' in url or 'gitlab.com' in url or 'gitee.com' in url:
            # 移除 .git 后缀（如果有）
            if url.endswith('.git'):
                url = url[:-4]
            
            # 如果是网页链接（包含 /tree/ 或 /blob/），提取仓库根 URL
            if '/tree/' in url or '/blob/' in url:
                parts = url.split('/')
                # 找到仓库名后的第一个特殊路径（tree/blob）
                repo_index = None
                for i, part in enumerate(parts):
                    if part in ['tree', 'blob']:
                        repo_index = i
                        break
                if repo_index:
                    url = '/'.join(parts[:repo_index])
            
            # 确保是 HTTPS URL
            if not url.startswith('http://') and not url.startswith('https://'):
                url = 'https://' + url
            
            # 添加 .git 后缀
            if not url.endswith('.git'):
                url = url + '.git'
        
        return url
    
    def install_node(self, url):
        """
        安装节点
        
        Args:
            url: 节点的安装地址（Git 仓库 URL 或 ZIP 文件 URL）
        
        Returns:
            status: 安装状态信息
        """
        if not url or not url.strip():
            return {"ui": {"text": ["错误: 请提供有效的安装地址 / Error: Please provide a valid installation URL"]}}
        
        url = url.strip()
        
        try:
            # 查找 custom_nodes 目录
            custom_nodes_dir = self.find_comfyui_custom_nodes_dir()
            
            if not custom_nodes_dir:
                # 如果找不到，尝试使用当前目录的父目录
                current_dir = os.path.dirname(os.path.abspath(__file__))
                custom_nodes_dir = os.path.join(os.path.dirname(current_dir), "custom_nodes")
                os.makedirs(custom_nodes_dir, exist_ok=True)
                print(f"警告: 未找到 ComfyUI custom_nodes 目录，使用 / Warning: ComfyUI custom_nodes directory not found, using: {custom_nodes_dir}")
            else:
                print(f"找到 custom_nodes 目录 / Found custom_nodes directory: {custom_nodes_dir}")
            
            # 判断是 Git 仓库还是 ZIP 文件
            is_git_repo = any(domain in url.lower() for domain in ['github.com', 'gitlab.com', 'gitee.com', 'git@'])
            is_zip_file = url.lower().endswith('.zip') or '/archive/' in url.lower()
            
            if is_git_repo and not is_zip_file:
                # Git 仓库安装
                return self._install_from_git(url, custom_nodes_dir)
            else:
                # ZIP 文件安装
                return self._install_from_zip(url, custom_nodes_dir)
                
        except Exception as e:
            error_msg = f"安装失败 / Installation failed: {str(e)}"
            print(error_msg)
            import traceback
            traceback.print_exc()
            return (error_msg,)
    
    def _install_from_git(self, url, custom_nodes_dir):
        """
        从 Git 仓库安装节点
        
        Args:
            url: Git 仓库 URL
            custom_nodes_dir: custom_nodes 目录路径
        
        Returns:
            status: 安装状态信息
        """
        try:
            # 规范化 URL
            git_url = self.normalize_git_url(url)
            
            # 提取仓库名称
            repo_name = os.path.basename(git_url).replace('.git', '')
            if not repo_name:
                # 如果无法提取，使用 URL 的一部分
                repo_name = git_url.split('/')[-1].replace('.git', '')
            
            install_path = os.path.join(custom_nodes_dir, repo_name)
            
            # 检查是否已存在
            if os.path.exists(install_path):
                # 如果已存在，尝试更新（使用 git pull）
                print(f"节点已存在 / Node already exists: {install_path}")
                print("尝试更新节点... / Attempting to update node...")
                try:
                    # 检查是否是 git 仓库
                    git_dir = os.path.join(install_path, '.git')
                    if os.path.exists(git_dir):
                        # 使用 git pull 更新
                        process = subprocess.Popen(
                            ['git', 'pull'],
                            cwd=install_path,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            universal_newlines=True,
                            bufsize=1
                        )
                        output_lines = []
                        for line in process.stdout:
                            line = line.strip()
                            if line:
                                print(line)
                                output_lines.append(line)
                        process.wait()
                        
                        if process.returncode == 0:
                            print(f"✓ 更新完成 / Update completed: {install_path}")
                            print("⚠️ 请重启 ComfyUI 以使新安装的节点生效 / Please restart ComfyUI for the newly installed node to take effect")
                            return {"ui": {"text": [f"✓ 更新完成 / Update completed: {install_path}\n⚠️ 请重启 ComfyUI 以使新安装的节点生效 / Please restart ComfyUI for the newly installed node to take effect"]}}
                        else:
                            return {"ui": {"text": [f"更新失败，返回码 / Update failed, return code: {process.returncode}\n请手动删除 {install_path} 后重新安装 / Please manually delete {install_path} and reinstall"]}}
                    else:
                        # 不是 git 仓库，需要删除后重新安装
                        return {"ui": {"text": [f"节点已存在但不是 Git 仓库 / Node exists but is not a Git repository: {install_path}\n如需重新安装，请手动删除该目录后再次运行 / To reinstall, please manually delete this directory and run again"]}}
                except Exception as e:
                    return {"ui": {"text": [f"更新失败 / Update failed: {str(e)}\n请手动删除 {install_path} 后重新安装 / Please manually delete {install_path} and reinstall"]}}
            
            print(f"开始克隆仓库 / Starting to clone repository: {git_url}")
            print(f"安装到 / Installing to: {install_path}")
            
            # 检查 git 是否可用
            try:
                subprocess.run(['git', '--version'], check=True, capture_output=True)
            except (subprocess.CalledProcessError, FileNotFoundError):
                return {"ui": {"text": ["错误: 未找到 git 命令，请先安装 Git / Error: Git command not found, please install Git first"]}}
            
            # 克隆仓库
            # 使用 subprocess 并显示进度
            process = subprocess.Popen(
                ['git', 'clone', '--progress', git_url, install_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1
            )
            
            # 实时输出进度
            output_lines = []
            for line in process.stdout:
                line = line.strip()
                if line:
                    print(line)
                    output_lines.append(line)
            
            process.wait()
            
            if process.returncode == 0:
                print(f"✓ 安装完成 / Installation completed: {install_path}")
                print("⚠️ 请重启 ComfyUI 以使新安装的节点生效 / Please restart ComfyUI for the newly installed node to take effect")
                return {"ui": {"text": [f"✓ 安装完成 / Installation completed: {install_path}\n⚠️ 请重启 ComfyUI 以使新安装的节点生效 / Please restart ComfyUI for the newly installed node to take effect"]}}
            else:
                error_msg = f"Git 克隆失败，返回码 / Git clone failed, return code: {process.returncode}"
                print(error_msg)
                return {"ui": {"text": [error_msg]}}
                
        except Exception as e:
            error_msg = f"Git 安装失败 / Git installation failed: {str(e)}"
            print(error_msg)
            import traceback
            traceback.print_exc()
            return {"ui": {"text": [error_msg]}}
    
    def _install_from_zip(self, url, custom_nodes_dir):
        """
        从 ZIP 文件安装节点
        
        Args:
            url: ZIP 文件 URL
            custom_nodes_dir: custom_nodes 目录路径
        
        Returns:
            status: 安装状态信息
        """
        try:
            print(f"开始下载 ZIP 文件 / Starting to download ZIP file: {url}")
            
            # 下载 ZIP 文件 - 优化下载速度
            session = requests.Session()
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            
            response = session.get(url, stream=True, timeout=(30, 300))  # 连接超时30秒，读取超时300秒
            response.raise_for_status()
            
            # 获取文件大小
            total_size = int(response.headers.get('content-length', 0))
            
            # 下载到临时文件
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
            temp_path = temp_file.name
            
            try:
                downloaded_size = 0
                block_size = 2 * 1024 * 1024  # 2MB 块大小（提高下载速度）
                
                with open(temp_path, 'wb') as f:
                    if total_size > 0:
                        with tqdm(total=total_size, unit='B', unit_scale=True, desc="下载中 / Downloading") as pbar:
                            for chunk in response.iter_content(chunk_size=block_size):
                                if chunk:
                                    f.write(chunk)
                                    downloaded_size += len(chunk)
                                    pbar.update(len(chunk))
                    else:
                        for chunk in response.iter_content(chunk_size=block_size):
                            if chunk:
                                f.write(chunk)
                                downloaded_size += len(chunk)
                                print(f"\r已下载 / Downloaded: {downloaded_size / 1024 / 1024:.2f} MB", end='', flush=True)
                        print()
                
                print("开始解压... / Starting to extract...")
                
                # 解压 ZIP 文件
                with zipfile.ZipFile(temp_path, 'r') as zip_ref:
                    # 获取 ZIP 文件中的所有文件列表
                    file_list = zip_ref.namelist()
                    
                    # 查找根目录名称（通常是第一个目录）
                    root_dir = None
                    for name in file_list:
                        if '/' in name:
                            root_dir = name.split('/')[0]
                            break
                    
                    # 检查根目录是否已存在
                    if root_dir:
                        extracted_path = os.path.join(custom_nodes_dir, root_dir)
                        if os.path.exists(extracted_path):
                            print(f"警告: 节点目录已存在 / Warning: Node directory already exists: {extracted_path}")
                            print("将覆盖现有文件... / Will overwrite existing files...")
                    
                    # 解压文件
                    total_files = len(file_list)
                    extracted = 0
                    
                    with tqdm(total=total_files, unit='files', desc="解压中 / Extracting") as pbar:
                        for member in zip_ref.namelist():
                            zip_ref.extract(member, custom_nodes_dir)
                            extracted += 1
                            pbar.update(1)
                    
                    # 如果 ZIP 文件包含单个根目录，显示安装路径
                    if root_dir:
                        extracted_path = os.path.join(custom_nodes_dir, root_dir)
                        print(f"节点安装路径 / Node installation path: {extracted_path}")
                
                print(f"✓ 安装完成 / Installation completed: {custom_nodes_dir}")
                print("⚠️ 请重启 ComfyUI 以使新安装的节点生效 / Please restart ComfyUI for the newly installed node to take effect")
                return {"ui": {"text": [f"✓ 安装完成 / Installation completed: {custom_nodes_dir}\n⚠️ 请重启 ComfyUI 以使新安装的节点生效 / Please restart ComfyUI for the newly installed node to take effect"]}}
                
            finally:
                # 清理临时文件
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
        except zipfile.BadZipFile:
            error_msg = "错误: 下载的文件不是有效的 ZIP 文件 / Error: The downloaded file is not a valid ZIP file"
            print(error_msg)
            return {"ui": {"text": [error_msg]}}
        except Exception as e:
            error_msg = f"ZIP 安装失败 / ZIP installation failed: {str(e)}"
            print(error_msg)
            import traceback
            traceback.print_exc()
            return {"ui": {"text": [error_msg]}}


# 注册节点
NODE_CLASS_MAPPINGS = {
    "HiveModelDownloader": HiveModelDownloader,
    "HiveNodeInstaller": HiveNodeInstaller,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "HiveModelDownloader": "Hive 模型下载器/Model Downloader - Github:﹫luguoli",
    "HiveNodeInstaller": "Hive 节点安装器/Node Installer - Github:﹫luguoli",
}

